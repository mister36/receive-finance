function Receivable({ type = "", name = "", date = "", amount }) {
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return (
    <div className="receivable-component">
      <div className="left">
        <div id="name">{name}</div>
        <div id="amount">{usdFormatter.format(amount)}</div>
      </div>

      <div id="date">{date}</div>

      <div
        id="button"
        style={{ background: type === "out" ? "#F0B700" : "#1d9e23" }}
      >
        {type === "out" ? "PAY" : "SELL"}
      </div>
    </div>
  );
}

export default Receivable;
