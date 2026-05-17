const PAGE_SCROLLBAR_STYLE_ID = "fmk-page-scrollbar-style";
const PAGE_SCROLLBAR_CLASS = "fmk-page-scrollbar-hidden";

const ensurePageScrollbarStyle = () => {
  if (document.getElementById(PAGE_SCROLLBAR_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = PAGE_SCROLLBAR_STYLE_ID;
  style.textContent = `
    html.${PAGE_SCROLLBAR_CLASS},
    html.${PAGE_SCROLLBAR_CLASS} body {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    html.${PAGE_SCROLLBAR_CLASS}::-webkit-scrollbar,
    html.${PAGE_SCROLLBAR_CLASS} body::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
    }
  `;
  document.head.appendChild(style);
};

export const hidePageScrollbar = () => {
  ensurePageScrollbarStyle();
  document.documentElement.classList.add(PAGE_SCROLLBAR_CLASS);
};

export const restorePageScrollbar = () => {
  document.documentElement.classList.remove(PAGE_SCROLLBAR_CLASS);
};
