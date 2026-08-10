export function SelectCursorIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M19.503 9.97c1.204.489 1.112 2.224-.137 2.583l-6.305 1.813l-2.88 5.895c-.571 1.168-2.296.957-2.569-.314L4.677 6.257A1.369 1.369 0 0 1 6.53 4.7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PanHandIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 13V5a1.5 1.5 0 1 1 3 0v6m0-1.5V4a1.5 1.5 0 1 1 3 0v7m0-1V5.5a1.5 1.5 0 1 1 3 0V13m0-2.5a1.5 1.5 0 1 1 3 0V15a6 6 0 0 1-6 6h-1.5a5 5 0 0 1-3.536-1.464l-3.864-3.864a1.5 1.5 0 1 1 2.121-2.122L8 15.5"
      />
    </svg>
  );
}
