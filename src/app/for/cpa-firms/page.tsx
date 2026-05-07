import type { Metadata } from "next";
import { BOUTIQUE_VERTICALS } from "@/data/boutique-verticals";
import {
  BoutiqueVerticalPage,
  buildVerticalMetadata,
} from "@/components/landing/boutique-vertical-page";

const SLUG = "cpa-firms";

export const metadata: Metadata = buildVerticalMetadata(SLUG);

export default function CpaFirmsPage() {
  return <BoutiqueVerticalPage vertical={BOUTIQUE_VERTICALS[SLUG]} />;
}
