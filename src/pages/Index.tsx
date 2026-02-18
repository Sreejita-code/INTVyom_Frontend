import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "@/lib/auth";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  return null;
};

export default Index;
