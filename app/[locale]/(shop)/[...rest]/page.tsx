import { notFound } from "next/navigation";

/** Neznámá URL v rámci obchodu → 404 se společným layoutem (navbar, patička). */
export default function CatchAllPage() {
  notFound();
}
