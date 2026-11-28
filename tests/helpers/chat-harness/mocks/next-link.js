import React from "react";
export default function Link({ href, children, onNavigate: _onNavigate, prefetch: _prefetch, ...rest }) {
  return React.createElement("a", { href, ...rest }, children);
}
