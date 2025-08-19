import { createHash } from 'crypto';

// QR → Merchant mapping system
interface QRData {
  vpa?: string;
  payeeName?: string;
  amount?: string;
  transactionNote?: string;
  mcc?: string; // Merchant Category Code
  merchantId?: string;
}

interface MerchantAlias {
  id: string;
  vpa: string;
  merchant_id: string;
  seen_count: number;
  last_seen_at: Date;
  confidence: number;
}

interface MerchantResolution {
  merchant_id: string;
  confidence: number;
  source: 'exact_match' | 'vpa_mapping' | 'name_fuzzy' | 'mcc_guess';
  merchant?: any;
  alternatives?: Array<{ merchant_id: string; confidence: number; reason: string }>;
}

class MerchantMapper {
  private storage: any;
  private aliasCache: Map<string, MerchantAlias> = new Map();

  constructor(storage: any) {
    this.storage = storage;
  }

  // Parse UPI QR code to extract merchant information
  parseUPIQR(qrData: string): QRData | null {
    try {
      // Handle UPI URLs like: upi://pay?pa=merchant@bank&pn=MerchantName&am=100&cu=INR
      const url = new URL(qrData);
      if (url.protocol === 'upi:' && url.pathname === '//pay') {
        const params = url.searchParams;
        return {
          vpa: params.get('pa') || undefined,
          payeeName: params.get('pn') || undefined,
          amount: params.get('am') || undefined,
          transactionNote: params.get('tn') || undefined,
          mcc: params.get('mc') || undefined
        };
      }

      // Handle raw VPA format
      if (qrData.includes('@') && !qrData.includes(' ')) {
        return { vpa: qrData.trim() };
      }

      // Handle JSON format QR codes
      const parsed = JSON.parse(qrData);
      return {
        vpa: parsed.vpa || parsed.pa,
        payeeName: parsed.payeeName || parsed.pn,
        amount: parsed.amount || parsed.am,
        transactionNote: parsed.transactionNote || parsed.tn,
        mcc: parsed.mcc || parsed.mc,
        merchantId: parsed.merchantId
      };
    } catch (error) {
      console.error('[MerchantMapper] Failed to parse QR data:', error);
      return null;
    }
  }

  // Resolve QR data to canonical merchant
  async resolveMerchant(qrData: string): Promise<MerchantResolution> {
    const parsed = this.parseUPIQR(qrData);
    if (!parsed) {
      throw new Error('Invalid QR code format');
    }

    // 1. Direct merchant ID match (highest confidence)
    if (parsed.merchantId) {
      const merchant = await this.storage.getMerchant(parsed.merchantId);
      if (merchant) {
        return {
          merchant_id: parsed.merchantId,
          confidence: 1.0,
          source: 'exact_match',
          merchant
        };
      }
    }

    // 2. VPA mapping lookup
    if (parsed.vpa) {
      const vpaResolution = await this.resolveByVPA(parsed.vpa);
      if (vpaResolution) {
        const merchant = await this.storage.getMerchant(vpaResolution.merchant_id);
        return {
          merchant_id: vpaResolution.merchant_id,
          confidence: vpaResolution.confidence,
          source: 'vpa_mapping',
          merchant
        };
      }
    }

    // 3. Fuzzy name matching
    if (parsed.payeeName) {
      const nameResolution = await this.resolveByName(parsed.payeeName);
      if (nameResolution.length > 0) {
        const best = nameResolution[0];
        const merchant = await this.storage.getMerchant(best.merchant_id);
        return {
          merchant_id: best.merchant_id,
          confidence: best.confidence,
          source: 'name_fuzzy',
          merchant,
          alternatives: nameResolution.slice(1, 4) // Top 3 alternatives
        };
      }
    }

    // 4. MCC-based category guess (lowest confidence)
    if (parsed.mcc) {
      const mccResolution = await this.resolveByMCC(parsed.mcc);
      if (mccResolution) {
        const merchant = await this.storage.getMerchant(mccResolution.merchant_id);
        return {
          merchant_id: mccResolution.merchant_id,
          confidence: mccResolution.confidence,
          source: 'mcc_guess',
          merchant
        };
      }
    }

    throw new Error('Unable to resolve merchant from QR data');
  }

  // Store and update VPA → merchant mapping
  async recordVPAMapping(vpa: string, merchantId: string): Promise<void> {
    const aliasId = this.generateAliasId(vpa);
    
    try {
      const existing = await this.storage.getMerchantAlias(aliasId);
      if (existing) {
        // Update existing mapping
        await this.storage.updateMerchantAlias(aliasId, {
          seen_count: existing.seen_count + 1,
          last_seen_at: new Date(),
          confidence: Math.min(1.0, existing.confidence + 0.1)
        });
      } else {
        // Create new mapping
        await this.storage.createMerchantAlias({
          id: aliasId,
          vpa,
          merchant_id: merchantId,
          seen_count: 1,
          last_seen_at: new Date(),
          confidence: 0.7 // Initial confidence for user-confirmed mapping
        });
      }

      // Update cache
      this.aliasCache.set(vpa, {
        id: aliasId,
        vpa,
        merchant_id: merchantId,
        seen_count: (existing?.seen_count || 0) + 1,
        last_seen_at: new Date(),
        confidence: existing ? Math.min(1.0, existing.confidence + 0.1) : 0.7
      });

      console.log(`[MerchantMapper] Recorded VPA mapping: ${vpa} → ${merchantId}`);
    } catch (error) {
      console.error('[MerchantMapper] Failed to record VPA mapping:', error);
    }
  }

  private async resolveByVPA(vpa: string): Promise<MerchantAlias | null> {
    // Check cache first
    if (this.aliasCache.has(vpa)) {
      return this.aliasCache.get(vpa)!;
    }

    try {
      const aliasId = this.generateAliasId(vpa);
      const alias = await this.storage.getMerchantAlias(aliasId);
      
      if (alias && alias.confidence > 0.5) {
        this.aliasCache.set(vpa, alias);
        return alias;
      }
    } catch (error) {
      console.error('[MerchantMapper] Error resolving by VPA:', error);
    }

    return null;
  }

  private async resolveByName(payeeName: string): Promise<Array<{ merchant_id: string; confidence: number; reason: string }>> {
    try {
      const merchants = await this.storage.getMerchants();
      const results: Array<{ merchant_id: string; confidence: number; reason: string }> = [];

      for (const merchant of merchants) {
        const confidence = this.calculateNameSimilarity(payeeName, merchant.name);
        if (confidence > 0.6) {
          results.push({
            merchant_id: merchant.id,
            confidence,
            reason: `Name similarity: "${payeeName}" → "${merchant.name}"`
          });
        }
      }

      // Sort by confidence descending
      return results.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('[MerchantMapper] Error resolving by name:', error);
      return [];
    }
  }

  private async resolveByMCC(mcc: string): Promise<{ merchant_id: string; confidence: number } | null> {
    // Map common MCCs to merchant categories
    const mccCategoryMap: { [key: string]: string } = {
      '5812': 'food', // Eating Places, Restaurants
      '5814': 'food', // Fast Food Restaurants
      '5411': 'food', // Grocery Stores, Supermarkets
      '4121': 'transport', // Taxicabs and Limousines
      '5541': 'transport', // Service Stations
      '5732': 'electronics', // Electronics Sales
      '5735': 'electronics', // Record Stores
      '5999': 'miscellaneous' // Miscellaneous Retail
    };

    const category = mccCategoryMap[mcc];
    if (!category) return null;

    try {
      const merchants = await this.storage.getMerchants();
      const categoryMerchants = merchants.filter((m: any) => m.category === category);
      
      if (categoryMerchants.length === 0) return null;

      // Return random merchant from category with low confidence
      const randomIndex = Math.floor(Math.random() * categoryMerchants.length);
      return {
        merchant_id: categoryMerchants[randomIndex].id,
        confidence: 0.3 // Low confidence for MCC-based guessing
      };
    } catch (error) {
      console.error('[MerchantMapper] Error resolving by MCC:', error);
      return null;
    }
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1.0;

    // Contains check
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    return Math.max(0, 1 - distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private generateAliasId(vpa: string): string {
    return createHash('sha256').update(vpa.toLowerCase()).digest('hex').substring(0, 16);
  }
}

export { MerchantMapper, type QRData, type MerchantResolution };