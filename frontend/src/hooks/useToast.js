import { useState, useEffect, useRef } from "react";

function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());

  // Show a notification
  const showToast = (message, type = "success") => {
    const id = crypto.randomUUID();

    const newToast = {
      id,
      message,
      type,
    };

    setToasts((previous) => [...previous, newToast]);

    // Automatically remove after 3 seconds
    const timer = setTimeout(() => {
      setToasts((previous) =>
        previous.filter((toast) => toast.id !== id)
      );

      timers.current.delete(timer);
    }, 3000);

    timers.current.add(timer);
  };

  // Remove a notification manually
  const removeToast = (id) => {
    setToasts((previous) =>
      previous.filter((toast) => toast.id !== id)
    );
  };

  // Clear timers when component unmounts
  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
  };
}

export default useToast;