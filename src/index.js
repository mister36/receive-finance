import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

import "./fonts/Hero-New/Hero New Bold.otf";
import "./fonts/Hero-New/Hero New Regular.otf";
import "./fonts/Hero-New/Hero New Medium.otf";
import "./fonts/Hero-New/Hero New Light.otf";
import "./fonts/Hero-New/Hero New SemiBold.otf";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
