import { useEffect, useState, useCallback } from 'react';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_ENTITLEMENT } from '../constants/theme';

// Replace with your actual RevenueCat API keys from the dashboard
const RC_API_KEY_IOS = 'appl_YOUR_REVENUECAT_IOS_KEY';
const RC_API_KEY_ANDROID = 'goog_YOUR_REVENUECAT_ANDROID_KEY';

export function useSubscription() {
  const [isProUser, setIsProUser] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
        Purchases.configure({ apiKey });
        await checkStatus();
        await loadPackages();
      } catch (e) {
        console.warn('RevenueCat init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const active = info.entitlements.active[REVENUECAT_ENTITLEMENT];
      setIsProUser(!!active);
    } catch (e) {
      setIsProUser(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (e) {
      console.warn('Failed to load offerings:', e);
    }
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT];
      setIsProUser(!!active);
      return !!active;
    } catch (e: any) {
      if (!e.userCancelled) throw e;
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      const active = info.entitlements.active[REVENUECAT_ENTITLEMENT];
      setIsProUser(!!active);
      return !!active;
    } catch (e) {
      throw e;
    }
  }, []);

  return { isProUser, packages, loading, purchasePackage, restorePurchases, checkStatus };
}
