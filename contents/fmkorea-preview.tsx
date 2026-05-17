import cssText from "data-text:~/style.css";
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo";

import FmkoreaPreview from "./fmkorea-preview/FmkoreaPreview";

export const config: PlasmoCSConfig = {
  matches: ["https://www.fmkorea.com/*"],
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

export default FmkoreaPreview;
