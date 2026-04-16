import { useState, useEffect, useCallback } from 'react';
import { checkServerConnection } from '../services/api';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async () => {
    setIsChecking(true);
    const online = await checkServerConnection();
    setIsOnline(online);
    setIsChecking(false);
    return online;
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { isOnline, isChecking, checkNow: check };
}
