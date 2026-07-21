import { ImageResponse } from "next/og";

// iOS の「ホーム画面に追加」用アイコン。角丸は iOS 側がマスクするため全面塗り。
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// icon.svg と同デザイン: 緑グラデ地に白い家＋掃除完了のチェック＋スパークル。
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><defs><linearGradient id="bg" x1="90" y1="0" x2="90" y2="180" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#83B78C"/><stop offset="1" stop-color="#639B6E"/></linearGradient></defs><rect width="180" height="180" fill="url(#bg)"/><path d="M90 39 L145 83.5 V132.5 A11.5 11.5 0 0 1 133.5 144 H46.5 A11.5 11.5 0 0 1 35 132.5 V83.5 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round"/><path d="M66.5 106 L83 122.5 L115.5 87.5" fill="none" stroke="#5E9468" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M140 28 c1.7 8.2 5.5 12 13.7 13.7 c-8.2 1.7 -12 5.5 -13.7 13.7 c-1.7 -8.2 -5.5 -12 -13.7 -13.7 c8.2 -1.7 12 -5.5 13.7 -13.7 Z" fill="#FFFFFF"/></svg>`;

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
