// Import the SVG as a URL
import logoSrc from "../assets/logo.svg";

const TicketBadge = () => {
  return (
    <div className="TicketBadge">
      <img src={logoSrc} alt="Logo" />
    </div>
  );
};

export default TicketBadge;
