class HistoryManager {
  private state = { isActive: false, previousTitle: "", previousUrl: "" };

  push(url: string, title: string, currentUrl: string) {
    if (this.state.isActive) return;
    this.state.isActive = true;
    this.state.previousTitle = document.title;
    this.state.previousUrl = currentUrl;
    history.pushState(null, "", url);
    document.title = title;
  }

  restore() {
    if (!this.state.isActive) return;
    this.state.isActive = false;
    history.replaceState(null, "", this.state.previousUrl);
    document.title = this.state.previousTitle;
  }

  isActive() {
    return this.state.isActive;
  }

  reset() {
    this.state.isActive = false;
    document.title = this.state.previousTitle;
  }
}

export const historyManager = new HistoryManager();
