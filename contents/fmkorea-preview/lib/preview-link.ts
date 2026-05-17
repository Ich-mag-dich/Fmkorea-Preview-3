export const getPreviewLink = (el: HTMLElement): HTMLAnchorElement | null => {
  const link = el.closest("a");
  if (
    link?.classList.contains("title") ||
    link?.classList.contains("hotdeal_var8") ||
    el.closest("td")?.classList.contains("title")
  ) {
    return link as HTMLAnchorElement;
  }
  return null;
};
