import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.js";
import Auth from "./pages/Auth.js";
import BusinessHome from "./pages/BusinessHome.js";
import InvestorHome from "./pages/InvestorHome";

import Header from "./components/Header";

import "./App.css";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/business" element={<BusinessHome />} />
        <Route path="/investor" element={<InvestorHome />} />
      </Routes>
    </Router>
  );
}

export default App;
