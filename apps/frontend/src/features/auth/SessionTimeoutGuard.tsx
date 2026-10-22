import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { recordSessionActivity, SESSION_LAST_ACTIVITY_KEY, SESSION_WARNING_MS, sessionTimeRemaining } from "./sessionTimeout";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];

export function SessionTimeoutGuard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [remaining, setRemaining] = useState(() => sessionTimeRemaining());
  const warningOpen = remaining > 0 && remaining <= SESSION_WARNING_MS;
  const warningOpenRef = useRef(warningOpen);
  const loggingOut = useRef(false);
  warningOpenRef.current = warningOpen;

  const timeOut = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try { await logout(); } finally { navigate("/login?sessionTimedOut=1", { replace: true }); }
  }, [logout, navigate]);

  const staySignedIn = useCallback(() => {
    recordSessionActivity();
    setRemaining(sessionTimeRemaining());
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(SESSION_LAST_ACTIVITY_KEY)) recordSessionActivity();
    const noteActivity = () => {
      // Once the warning is visible, require an explicit choice so it cannot be
      // dismissed accidentally by a mouse or keyboard event.
      if (warningOpenRef.current) return;
      recordSessionActivity();
      setRemaining(sessionTimeRemaining());
    };
    const syncActivity = (event: StorageEvent) => {
      if (event.key === SESSION_LAST_ACTIVITY_KEY) setRemaining(sessionTimeRemaining());
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, noteActivity, { passive: true });
    window.addEventListener("storage", syncActivity);
    const timer = window.setInterval(() => {
      const next = sessionTimeRemaining();
      setRemaining(next);
      if (next === 0) void timeOut();
    }, 1000);
    return () => {
      window.clearInterval(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, noteActivity);
      window.removeEventListener("storage", syncActivity);
    };
  }, [timeOut]);

  const seconds = Math.max(1, Math.ceil(remaining / 1000));
  return <Dialog open={warningOpen} aria-labelledby="session-timeout-title">
    <DialogTitle id="session-timeout-title">Your session is about to expire</DialogTitle>
    <DialogContent>
      <Alert severity="warning">You will be signed out in {seconds} second{seconds === 1 ? "" : "s"} due to inactivity.</Alert>
    </DialogContent>
    <DialogActions>
      <Button color="inherit" onClick={() => void timeOut()}>Sign out now</Button>
      <Button variant="contained" onClick={staySignedIn}>Stay signed in</Button>
    </DialogActions>
  </Dialog>;
}
