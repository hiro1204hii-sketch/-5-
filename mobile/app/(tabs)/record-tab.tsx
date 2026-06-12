import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RecordTab() {
  useEffect(() => { router.push('/record'); }, []);
  return null;
}
