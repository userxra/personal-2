import { useEffect, useState } from 'react';
import type { Device } from './logic';

const QUERY = '(hover: none) and (pointer: coarse)';

/** A touch device (phone or tablet) has a coarse pointer and no hover; a computer does not. */
export function getDevice(): Device {
  try {
    return window.matchMedia(QUERY).matches ? 'touch' : 'pc';
  } catch {
    return 'pc';
  }
}

export function useDevice(): Device {
  const [d, setD] = useState<Device>(getDevice);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setD(getDevice());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return d;
}
