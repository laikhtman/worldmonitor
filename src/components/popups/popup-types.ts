import type { TechHQ } from '@/config/tech-geo';
import type { AIDataCenter, SocialUnrestEvent } from '@/types';

export interface TechEventPopupData {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  country: string;
  startDate: string;
  endDate: string;
  url: string | null;
  daysUntil: number;
}

export interface TechHQClusterData {
  items: TechHQ[];
  city: string;
  country: string;
  count?: number;
  faangCount?: number;
  unicornCount?: number;
  publicCount?: number;
  sampled?: boolean;
}

export interface TechEventClusterData {
  items: TechEventPopupData[];
  location: string;
  country: string;
  count?: number;
  soonCount?: number;
  sampled?: boolean;
}

export interface StockExchangePopupData {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  tier: string;
  marketCap?: number;
  tradingHours?: string;
  timezone?: string;
  description?: string;
}

export interface FinancialCenterPopupData {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  gfciRank?: number;
  specialties?: string[];
  description?: string;
}

export interface CentralBankPopupData {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  type: string;
  currency?: string;
  description?: string;
}

export interface CommodityHubPopupData {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  commodities?: string[];
  description?: string;
}

export interface ProtestClusterData {
  items: SocialUnrestEvent[];
  country: string;
  count?: number;
  riotCount?: number;
  highSeverityCount?: number;
  verifiedCount?: number;
  totalFatalities?: number;
  sampled?: boolean;
}

export interface DatacenterClusterData {
  items: AIDataCenter[];
  region: string;
  country: string;
  count?: number;
  totalChips?: number;
  totalPowerMW?: number;
  existingCount?: number;
  plannedCount?: number;
  sampled?: boolean;
}
