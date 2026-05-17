import { BASE_URL } from "../constants";
import type { MemberPopup, PostData } from "../types";

interface MemberPopupMenuProps {
  popup: MemberPopup;
  post: PostData | null;
  onClose: () => void;
}

export function MemberPopupMenu({ popup, post, onClose }: MemberPopupMenuProps) {
  const mid = post?.mid ?? "humor";
  const items = [
    {
      icon: "https://www.fmkorea.com/modules/communication/tpl/images/icon_write_message.gif",
      label: "쪽지 보내기",
      onClick: () => {
        window.open(
          `${BASE_URL}/index.php?module=communication&act=dispCommunicationSendMessage&receiver_srl=${popup.memberSrl}`,
          "popup",
          "width=500,height=500,scrollbars=yes",
        );
        onClose();
      },
    },
    {
      icon: "https://static.fmkorea.com/modules/member/tpl/images/icon_view_info.gif",
      label: "회원 정보 보기",
      onClick: () => {
        window.open(
          `${BASE_URL}/index.php?mid=${mid}&act=dispMemberInfo&member_srl=${popup.memberSrl}`,
          "_blank",
        );
        onClose();
      },
    },
    {
      icon: "https://www.fmkorea.com/modules/member/tpl/images/icon_view_written.gif",
      label: "작성 글 보기",
      onClick: () => {
        window.open(
          `${BASE_URL}/index.php?mid=${mid}&search_target=member_srl&search_keyword=${popup.memberSrl}`,
          "_blank",
        );
        onClose();
      },
    },
    {
      icon: "https://www.fmkorea.com/modules/blind/tpl/icon_blind.gif",
      label: "블라인드(글,댓글)",
      onClick: () => {
        try {
          (window as any).blind_click(null, popup.memberSrl, 0);
        } catch {}
        onClose();
      },
    },
    {
      icon: "https://www.fmkorea.com/modules/blind/tpl/icon_blind.gif",
      label: "블라인드(쪽지)",
      onClick: () => {
        try {
          (window as any).blind_click(null, popup.memberSrl, 1);
        } catch {}
        onClose();
      },
    },
  ];

  return (
    <div
      className="absolute z-[2147483648] min-w-[160px] border border-gray-300 bg-white py-1 shadow-lg"
      style={{ top: popup.y, left: popup.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <ul>
        {items.map(({ icon, label, onClick }) => (
          <li key={label}>
            <button
              onClick={onClick}
              className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-[#e8f0fe]"
            >
              <img
                src={icon}
                alt=""
                className="h-4 w-4 shrink-0 object-contain"
              />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
