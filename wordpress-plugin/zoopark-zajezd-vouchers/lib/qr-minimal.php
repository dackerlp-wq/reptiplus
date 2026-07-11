<?php
/**
 * QR kód generátor – Pure PHP + GD
 * Verze 2, Error Correction M, Alphanumeric mode
 * Specificky pro kódy ZOO-XXXX-XXXX (12 znaků)
 * 
 * Přímá implementace dle QR Code spec ISO 18004
 */
class Zoo_QR {

    // Tabulka GF(256)
    private static $EXP = [];
    private static $LOG = [];

    private static function initGF() {
        if (!empty(self::$EXP)) return;
        $x = 1;
        for ($i = 0; $i < 255; $i++) {
            self::$EXP[$i] = $x;
            self::$LOG[$x] = $i;
            $x *= 2;
            if ($x >= 256) $x ^= 0x11D;
        }
        self::$EXP[255] = self::$EXP[0];
    }

    private static function gfMul($a, $b) {
        if ($a === 0 || $b === 0) return 0;
        return self::$EXP[(self::$LOG[$a] + self::$LOG[$b]) % 255];
    }

    /**
     * Hlavní metoda – vygeneruje QR PNG
     */
    public static function png($text, $file, $cellSize = 8, $margin = 4) {
        self::initGF();
        
        // Verze 2 = 25x25, M level, max 34 alfanumerických znaků
        $N = 25;
        
        // 1. Zakóduj data
        $dataBits = self::encodeAlphanumeric($text);
        if ($dataBits === false) {
            error_log('[Zoo_QR] Neplatné znaky v: ' . $text);
            return false;
        }
        
        // 2. Doplň na 28 datových bytů (verze 2-M)
        $dataBytes = self::toBytes($dataBits, 28);
        
        // 3. Reed-Solomon ECC (16 EC bytů pro verzi 2-M)
        $ecBytes = self::reedSolomon($dataBytes, 16);
        
        // 4. Finální bitový stream
        $allBytes = array_merge($dataBytes, $ecBytes);
        $bits = '';
        foreach ($allBytes as $b) {
            $bits .= sprintf('%08b', $b);
        }
        
        // 5. Sestav matici
        $matrix = self::buildMatrix($N, $bits);
        
        // 6. Vykresli PNG
        return self::renderPng($matrix, $N, $file, $cellSize, $margin);
    }

    private static function encodeAlphanumeric($text) {
        $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        $bits  = '';
        
        // Mode indicator: 0010 (alphanumeric)
        $bits .= '0010';
        
        // Character count: 9 bits pro verzi 1-9
        $len = strlen($text);
        $bits .= sprintf('%09b', $len);
        
        // Kódování párů
        for ($i = 0; $i < $len - 1; $i += 2) {
            $v1 = strpos($chars, $text[$i]);
            $v2 = strpos($chars, $text[$i+1]);
            if ($v1 === false || $v2 === false) return false;
            $bits .= sprintf('%011b', $v1 * 45 + $v2);
        }
        
        // Zbývající znak
        if ($len % 2 === 1) {
            $v = strpos($chars, $text[$len-1]);
            if ($v === false) return false;
            $bits .= sprintf('%06b', $v);
        }
        
        return $bits;
    }

    private static function toBytes($bits, $capacity) {
        // Terminator
        $pad = min(4, $capacity * 8 - strlen($bits));
        $bits .= str_repeat('0', $pad);
        
        // Byte alignment
        while (strlen($bits) % 8 !== 0) $bits .= '0';
        
        // Pad codewords
        $padWords = [0xEC, 0x11];
        $pi = 0;
        while (strlen($bits) < $capacity * 8) {
            $bits .= sprintf('%08b', $padWords[$pi % 2]);
            $pi++;
        }
        
        // Převod na pole bytů
        $bytes = [];
        for ($i = 0; $i < $capacity; $i++) {
            $bytes[] = bindec(substr($bits, $i * 8, 8));
        }
        return $bytes;
    }

    private static function reedSolomon($data, $ecCount) {
        // Generující polynom pro ecCount EC bytů
        $gen = [1];
        for ($i = 0; $i < $ecCount; $i++) {
            $newGen = array_fill(0, count($gen) + 1, 0);
            $alpha  = self::$EXP[$i];
            foreach ($gen as $j => $v) {
                $newGen[$j]   ^= $v;
                $newGen[$j+1] ^= self::gfMul($v, $alpha);
            }
            $gen = $newGen;
        }
        
        // Dělení
        $msg = array_merge($data, array_fill(0, $ecCount, 0));
        for ($i = 0; $i < count($data); $i++) {
            $coef = $msg[$i];
            if ($coef === 0) continue;
            for ($j = 1; $j < count($gen); $j++) {
                $msg[$i + $j] ^= self::gfMul($gen[$j], $coef);
            }
        }
        return array_slice($msg, count($data));
    }

    private static function buildMatrix($N, $bits) {
        // Inicializuj matici: null = volno, true/false = data/funkce
        $m = array_fill(0, $N, array_fill(0, $N, null));
        
        // Finder patterns (3 rohy)
        self::placeFinderPattern($m, 0, 0);
        self::placeFinderPattern($m, 0, $N - 7);
        self::placeFinderPattern($m, $N - 7, 0);
        
        // Timing patterns (řádek 6 a sloupec 6)
        for ($i = 8; $i < $N - 8; $i++) {
            $m[6][$i] = ($i % 2 === 0);
            $m[$i][6] = ($i % 2 === 0);
        }
        
        // Dark module
        $m[$N - 8][8] = true;
        
        // Format info (verze 2-M, maska 2 = 101001011011010)
        // Použijeme masku 2 (col % 3 == 0) - dobrá pro alfanumerická data
        $maskId = 2;
        $fmtBits = self::formatInfo($maskId);
        self::placeFormatInfo($m, $N, $fmtBits);
        
        // Umísti data
        self::placeData($m, $N, $bits, $maskId);
        
        return $m;
    }

    private static function placeFinderPattern(&$m, $row, $col) {
        $pattern = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1],
        ];
        $N = count($m);
        // Finder + separator (8x8 oblast)
        for ($r = -1; $r <= 7; $r++) {
            for ($c = -1; $c <= 7; $c++) {
                $rr = $row + $r;
                $cc = $col + $c;
                if ($rr < 0 || $rr >= $N || $cc < 0 || $cc >= $N) continue;
                if ($r >= 0 && $r <= 6 && $c >= 0 && $c <= 6) {
                    $m[$rr][$cc] = (bool)$pattern[$r][$c];
                } else {
                    $m[$rr][$cc] = false; // separator
                }
            }
        }
    }

    private static function formatInfo($maskId) {
        // Error correction level M = 00 (v QR spec), mask pattern
        $data = (0b00 << 3) | $maskId; // M = 00
        
        // BCH kód
        $g = 0x537;
        $d = $data << 10;
        for ($i = 4; $i >= 0; $i--) {
            if (($d >> ($i + 10)) & 1) $d ^= $g << $i;
        }
        $fmt = ($data << 10) | $d;
        $fmt ^= 0x5412; // XOR maska
        
        // Vrátí pole 15 bitů (LSB první pro placeFormatInfo)
        $bits = [];
        for ($i = 0; $i < 15; $i++) {
            $bits[$i] = ($fmt >> $i) & 1;
        }
        return $bits;
    }

    private static function placeFormatInfo(&$m, $N, $bits) {
        // Levý/horní (čte bity 0..14)
        $pos1 = [
            [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
            [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]
        ];
        foreach ($pos1 as $i => $p) {
            $m[$p[0]][$p[1]] = (bool)$bits[$i];
        }
        // Pravý/dolní (kopie)
        $pos2_r = [$N-1,$N-2,$N-3,$N-4,$N-5,$N-6,$N-7,
                   $N-8, 8, 8, 8, 8, 8, 8, 8];
        $pos2_c = [8,8,8,8,8,8,8,
                   8,$N-8,$N-7,$N-6,$N-5,$N-4,$N-3,$N-2];
        for ($i = 0; $i < 15; $i++) {
            $m[$pos2_r[$i]][$pos2_c[$i]] = (bool)$bits[$i];
        }
    }

    private static function placeData(&$m, $N, $bits, $maskId) {
        $bitIdx = 0;
        $upward = true;
        
        for ($right = $N - 1; $right >= 1; $right -= 2) {
            if ($right === 6) $right = 5; // přeskoč timing sloupec
            
            for ($vert = 0; $vert < $N; $vert++) {
                $row = $upward ? ($N - 1 - $vert) : $vert;
                
                for ($k = 0; $k < 2; $k++) {
                    $col = $right - $k;
                    if ($m[$row][$col] !== null) continue;
                    
                    $bit = isset($bits[$bitIdx]) ? (int)$bits[$bitIdx] : 0;
                    $bitIdx++;
                    
                    // Aplikuj masku
                    if (self::applyMask($maskId, $row, $col)) $bit ^= 1;
                    
                    $m[$row][$col] = (bool)$bit;
                }
            }
            $upward = !$upward;
        }
    }

    private static function applyMask($id, $r, $c) {
        switch ($id) {
            case 0: return ($r + $c) % 2 === 0;
            case 1: return $r % 2 === 0;
            case 2: return $c % 3 === 0;
            case 3: return ($r + $c) % 3 === 0;
            case 4: return (floor($r/2) + floor($c/3)) % 2 === 0;
            case 5: return ($r * $c) % 2 + ($r * $c) % 3 === 0;
            case 6: return (($r * $c) % 2 + ($r * $c) % 3) % 2 === 0;
            case 7: return (($r + $c) % 2 + ($r * $c) % 3) % 2 === 0;
        }
        return false;
    }

    private static function renderPng($m, $N, $file, $cellSize, $margin) {
        if (!extension_loaded('gd')) {
            error_log('[Zoo_QR] GD extension není dostupná');
            return false;
        }
        
        $total = ($N + $margin * 2) * $cellSize;
        $img   = imagecreatetruecolor($total, $total);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        imagefill($img, 0, 0, $white);
        
        for ($r = 0; $r < $N; $r++) {
            for ($c = 0; $c < $N; $c++) {
                if ($m[$r][$c]) {
                    $x1 = ($c + $margin) * $cellSize;
                    $y1 = ($r + $margin) * $cellSize;
                    imagefilledrectangle($img, $x1, $y1,
                        $x1 + $cellSize - 1, $y1 + $cellSize - 1, $black);
                }
            }
        }
        
        $ok = imagepng($img, $file);
        imagedestroy($img);
        return $ok;
    }
}
