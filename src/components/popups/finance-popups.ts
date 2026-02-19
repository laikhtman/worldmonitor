import type { Spaceport, CriticalMineralProject } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import type { StockExchangePopupData, FinancialCenterPopupData, CentralBankPopupData, CommodityHubPopupData } from './popup-types';

export function renderSpaceportPopup(port: Spaceport): string {
  const statusColors: Record<string, string> = {
    'active': 'elevated',
    'construction': 'high',
    'inactive': 'low',
  };
  const statusLabels: Record<string, string> = {
    'active': t('popups.spaceport.status.active'),
    'construction': t('popups.spaceport.status.construction'),
    'inactive': t('popups.spaceport.status.inactive'),
  };

  return `
    <div class="popup-header spaceport ${port.status}">
      <span class="popup-icon">🚀</span>
      <span class="popup-title">${escapeHtml(port.name.toUpperCase())}</span>
      <span class="popup-badge ${statusColors[port.status] || 'normal'}">${statusLabels[port.status] || port.status.toUpperCase()}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(port.operator)} • ${escapeHtml(port.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.spaceport.launchActivity')}</span>
          <span class="stat-value">${escapeHtml(port.launches.toUpperCase())}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${port.lat.toFixed(2)}°, ${port.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.spaceport.description')}</p>
    </div>
  `;
}

export function renderMineralPopup(mine: CriticalMineralProject): string {
  const statusColors: Record<string, string> = {
    'producing': 'elevated',
    'development': 'high',
    'exploration': 'low',
  };
  const statusLabels: Record<string, string> = {
    'producing': t('popups.mineral.status.producing'),
    'development': t('popups.mineral.status.development'),
    'exploration': t('popups.mineral.status.exploration'),
  };

  // Icon based on mineral type
  const icon = mine.mineral === 'Lithium' ? '🔋' : mine.mineral === 'Rare Earths' ? '🧲' : '💎';

  return `
    <div class="popup-header mineral ${mine.status}">
      <span class="popup-icon">${icon}</span>
      <span class="popup-title">${escapeHtml(mine.name.toUpperCase())}</span>
      <span class="popup-badge ${statusColors[mine.status] || 'normal'}">${statusLabels[mine.status] || mine.status.toUpperCase()}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${t('popups.mineral.projectSubtitle', { mineral: escapeHtml(mine.mineral.toUpperCase()) })}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.operator')}</span>
          <span class="stat-value">${escapeHtml(mine.operator)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.country')}</span>
          <span class="stat-value">${escapeHtml(mine.country)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${mine.lat.toFixed(2)}°, ${mine.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${escapeHtml(mine.significance)}</p>
    </div>
  `;
}

export function renderStockExchangePopup(exchange: StockExchangePopupData): string {
  const tierLabel = exchange.tier.toUpperCase();
  const tierClass = exchange.tier === 'mega' ? 'high' : exchange.tier === 'major' ? 'medium' : 'low';

  return `
    <div class="popup-header exchange">
      <span class="popup-title">${escapeHtml(exchange.shortName)}</span>
      <span class="popup-badge ${tierClass}">${tierLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(exchange.name)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(exchange.city)}, ${escapeHtml(exchange.country)}</span>
        </div>
        ${exchange.marketCap ? `<div class="popup-stat"><span class="stat-label">${t('popups.stockExchange.marketCap')}</span><span class="stat-value">$${exchange.marketCap}T</span></div>` : ''}
        ${exchange.tradingHours ? `<div class="popup-stat"><span class="stat-label">${t('popups.tradingHours')}</span><span class="stat-value">${escapeHtml(exchange.tradingHours)}</span></div>` : ''}
      </div>
      ${exchange.description ? `<p class="popup-description">${escapeHtml(exchange.description)}</p>` : ''}
    </div>
  `;
}

export function renderFinancialCenterPopup(center: FinancialCenterPopupData): string {
  const typeLabel = center.type.toUpperCase();

  return `
    <div class="popup-header financial-center">
      <span class="popup-title">${escapeHtml(center.name)}</span>
      <span class="popup-badge">${typeLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(center.city)}, ${escapeHtml(center.country)}</span>
        </div>
        ${center.gfciRank ? `<div class="popup-stat"><span class="stat-label">${t('popups.financialCenter.gfciRank')}</span><span class="stat-value">#${center.gfciRank}</span></div>` : ''}
      </div>
      ${center.specialties && center.specialties.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.financialCenter.specialties')}</span>
          <div class="popup-tags">
            ${center.specialties.map(s => `<span class="popup-tag">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${center.description ? `<p class="popup-description">${escapeHtml(center.description)}</p>` : ''}
    </div>
  `;
}

export function renderCentralBankPopup(bank: CentralBankPopupData): string {
  const typeLabel = bank.type.toUpperCase();

  return `
    <div class="popup-header central-bank">
      <span class="popup-title">${escapeHtml(bank.shortName)}</span>
      <span class="popup-badge">${typeLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(bank.name)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(bank.city)}, ${escapeHtml(bank.country)}</span>
        </div>
        ${bank.currency ? `<div class="popup-stat"><span class="stat-label">${t('popups.centralBank.currency')}</span><span class="stat-value">${escapeHtml(bank.currency)}</span></div>` : ''}
      </div>
      ${bank.description ? `<p class="popup-description">${escapeHtml(bank.description)}</p>` : ''}
    </div>
  `;
}

export function renderCommodityHubPopup(hub: CommodityHubPopupData): string {
  const typeLabel = hub.type.toUpperCase();

  return `
    <div class="popup-header commodity-hub">
      <span class="popup-title">${escapeHtml(hub.name)}</span>
      <span class="popup-badge">${typeLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(hub.city)}, ${escapeHtml(hub.country)}</span>
        </div>
      </div>
      ${hub.commodities && hub.commodities.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.commodityHub.commodities')}</span>
          <div class="popup-tags">
            ${hub.commodities.map(c => `<span class="popup-tag">${escapeHtml(c)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${hub.description ? `<p class="popup-description">${escapeHtml(hub.description)}</p>` : ''}
    </div>
  `;
}
