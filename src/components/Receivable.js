import { useEffect, useRef, useState } from "react";

function Receivable({
  type = "",
  name = "",
  date = "",
  amount,
  createSellOffer,
}) {
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const now = new Date();
  const diffTime = Math.abs(date - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  const [clicked, setClicked] = useState(false);

  // anim
  useEffect(() => {
    containerRef.current.classList.add("anim");
  }, []);

  return (
    <div
      className="receivable-component"
      ref={containerRef}
      style={{ paddingRight: type === "out" ? "5px" : "0px" }}
    >
      {type === "out" ? (
        <>
          <div className="left" style={{ width: "50%" }}>
            <div id="amount">{usdFormatter.format(amount)}</div>
            <div className="time-until-container">
              <div id="time-until">Funds drawn in {diffDays} days</div>
            </div>
          </div>

          <div id="vertical-line"></div>

          <div>{date.toLocaleDateString()}</div>
        </>
      ) : (
        <>
          <div className="left">
            <div id="name">{name}</div>
            <div id="amount">{usdFormatter.format(amount)}</div>
          </div>

          <div id="date">{date}</div>

          <div
            className="button active"
            style={{ background: type === "out" ? "#F0B700" : "#1d9e23" }}
            onClick={() => {
              if (clicked) {
                return;
              }
              buttonRef.current.classList.remove("active");
              createSellOffer();
              setClicked(true);
            }}
            ref={buttonRef}
          >
            {type === "out" ? "PAY" : "SELL"}
          </div>
        </>
      )}
    </div>
  );
}

export default Receivable;
