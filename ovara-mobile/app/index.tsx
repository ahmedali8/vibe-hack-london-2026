import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getProfile } from '../lib/storage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (profile) {
        router.replace('/(tabs)/cycle');
      } else {
        router.replace('/onboarding');
      }
    })();
  }, []);

  return null;
}
