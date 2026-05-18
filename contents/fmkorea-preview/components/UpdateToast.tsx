interface UpdateToastProps {
  version: string;
  onClose: () => void;
}

export function UpdateToast({ version, onClose }: UpdateToastProps) {
  return (
    <div
      className="fmk-toast-animate fixed bottom-6 right-6 z-[2147483647] w-80 overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">
              에펨코리아 미리보기 업데이트
            </p>
            <p className="mt-1 text-xs text-gray-500">
              v{version} - 비디오 소리 조절 저장, 댓글 UI 개선, 레벨/아이콘
              표시, 스크롤/팝업 위치 수정, 구조 분리
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="fmk-toast-progress h-1 bg-blue-500" />
    </div>
  );
}
