import { ImageResponse } from "next/og";

// iOS の「ホーム画面に追加」用アイコン。角丸は iOS 側がマスクするため全面塗り。
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 企画書のアクセントカラー（#6FA378）と「完了」のチェックマークを踏襲。
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#6FA378"/><path d="M49.5 91.7 L77 119.3 L130.5 58" fill="none" stroke="#FFFFFF" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={size.width}
          height={size.height}
          src={`data:image/svg+xml,${encodeURIComponent(icon)}`}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
