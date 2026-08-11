import { Manrope, Prata } from "next/font/google";

export const displayFont = Prata({
  weight: "400",
  subsets: ["cyrillic", "latin"],
  variable: "--font-prata",
  display: "swap",
});

export const interfaceFont = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const fontVariables = `${displayFont.variable} ${interfaceFont.variable}`;
