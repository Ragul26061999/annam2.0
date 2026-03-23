'use client';

import { usePathname } from 'next/navigation';
import ScrollButtons from './ScrollButtons';

export default function ConditionalScrollButtons() {
  const pathname = usePathname();
  
  // Hide scroll buttons on discharge summary pages
  if (pathname?.includes('/inpatient/discharge/')) {
    return null;
  }
  
  return <ScrollButtons />;
}
