// Chữ lỗi đỏ nhỏ dưới một ô nhập.
export default function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-error-text">{message}</p>;
}
