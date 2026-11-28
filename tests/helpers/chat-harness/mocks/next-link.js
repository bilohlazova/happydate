import React from "react";
export default function Link({ href, children, onNavigate, prefetch, ...rest }) {
  return React.createElement("a", { href, ...rest }, children);
}
