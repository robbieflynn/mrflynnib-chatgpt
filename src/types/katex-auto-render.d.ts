declare module "katex/contrib/auto-render" {
  type MathDelimiter = {
    left: string;
    right: string;
    display: boolean;
  };

  type AutoRenderOptions = {
    delimiters?: MathDelimiter[];
    throwOnError?: boolean;
    strict?: boolean | "ignore" | "warn" | "error";
    [option: string]: unknown;
  };

  export default function renderMathInElement(
    element: HTMLElement,
    options?: AutoRenderOptions,
  ): void;
}
