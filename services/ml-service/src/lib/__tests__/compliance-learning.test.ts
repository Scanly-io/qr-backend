import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  scrapeWCAGGuidelines,
  scrapeAODARegulations,
  scrapeADARequirements,
  trainCompliancePredictor,
  predictComplianceIssues,
  detectNewComplianceRules,
  updateComplianceKnowledge,
  getActiveComplianceRules,
} from '../compliance-learning';
import { db } from '../../db';
import { complianceRules, accessibilityScans, mlModels } from '../../schema';
import { eq, sql } from 'drizzle-orm';

describe('ML Compliance Learning Engine', () => {
  
  // Clean up before and after tests
  beforeAll(async () => {
    // Clear test data
    await db.delete(complianceRules);
    await db.delete(mlModels).where(eq(mlModels.type, 'compliance'));
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(complianceRules);
    await db.delete(mlModels).where(eq(mlModels.type, 'compliance'));
  });

  describe('Compliance Rule Scraping', () => {
    
    it('should scrape WCAG guidelines', async () => {
      const rules = await scrapeWCAGGuidelines();
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      // Check structure of first rule
      const firstRule = rules[0];
      expect(firstRule).toHaveProperty('standard');
      expect(firstRule).toHaveProperty('ruleId');
      expect(firstRule).toHaveProperty('title');
      expect(firstRule).toHaveProperty('description');
      expect(firstRule).toHaveProperty('level');
      
      // Check for WCAG 2.1 rules
      const wcag21Rules = rules.filter(r => r.standard === 'WCAG-2.1');
      expect(wcag21Rules.length).toBeGreaterThan(0);
      
      // Check for WCAG 2.2 NEW rules
      const wcag22Rules = rules.filter(r => r.standard === 'WCAG-2.2');
      expect(wcag22Rules.length).toBeGreaterThan(0);
      
      // Verify specific WCAG 2.2 rules
      const focusAppearance = rules.find(r => r.ruleId === '2.4.11');
      expect(focusAppearance).toBeDefined();
      expect(focusAppearance?.title).toContain('Focus');
      
      const consistentHelp = rules.find(r => r.ruleId === '3.2.6');
      expect(consistentHelp).toBeDefined();
      expect(consistentHelp?.title).toContain('Consistent Help');
      
      console.log('✅ WCAG Rules scraped:', rules.length);
      console.log('   - WCAG 2.1:', wcag21Rules.length);
      console.log('   - WCAG 2.2:', wcag22Rules.length);
    });

    it('should scrape Ontario AODA regulations', async () => {
      const rules = await scrapeAODARegulations();
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      // Check for Section 14 (Web Content)
      const section14 = rules.find(r => r.ruleId.includes('Section 14'));
      expect(section14).toBeDefined();
      expect(section14?.jurisdiction).toBe('Ontario');
      expect(section14?.mandatory).toBe(true);
      
      // Check for WCAG 2.0 Level AA requirement
      const wcagRequirement = rules.find(r => 
        r.description.toLowerCase().includes('wcag 2.0') &&
        r.description.toLowerCase().includes('level aa')
      );
      expect(wcagRequirement).toBeDefined();
      
      console.log('✅ AODA Rules scraped:', rules.length);
      rules.forEach(r => {
        console.log(`   - ${r.ruleId}: ${r.title}`);
      });
    });

    it('should scrape US ADA requirements', async () => {
      const rules = await scrapeADARequirements();
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      // Check for Title III
      const titleIII = rules.find(r => r.ruleId.includes('Title III'));
      expect(titleIII).toBeDefined();
      expect(titleIII?.jurisdiction).toBe('US');
      
      // Check for Section 508
      const section508 = rules.find(r => r.ruleId.includes('Section 508'));
      expect(section508).toBeDefined();
      
      console.log('✅ ADA Rules scraped:', rules.length);
      rules.forEach(r => {
        console.log(`   - ${r.ruleId}: ${r.title}`);
      });
    });

  });

  describe('Model Training', () => {
    
    it('should train compliance predictor model', async () => {
      // Insert mock scan data for training
      const mockScans = [];
      for (let i = 0; i < 150; i++) {
        mockScans.push({
          id: `test-scan-${i}`,
          micrositeId: `test-microsite-${i}`,
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          wcagAA: Math.random() > 0.3,
          wcagAAA: Math.random() > 0.7,
          adaCompliant: Math.random() > 0.4,
          issues: JSON.stringify([
            { rule: '1.1.1', impact: 'critical' },
            { rule: '1.4.3', impact: 'serious' },
          ]),
          htmlStructure: JSON.stringify({
            images_without_alt: Math.floor(Math.random() * 10),
            low_contrast_text: Math.floor(Math.random() * 5),
            missing_aria: Math.floor(Math.random() * 8),
            has_main_landmark: Math.random() > 0.5,
            has_lang_attribute: Math.random() > 0.3,
            heading_errors: Math.floor(Math.random() * 3),
            form_errors: Math.floor(Math.random() * 2),
          }),
          createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Last 6 months
        });
      }
      
      await db.insert(accessibilityScans).values(mockScans);
      
      // Train model
      const result = await trainCompliancePredictor();
      
      expect(result).toBeDefined();
      expect(result.modelId).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.trainingDataSize).toBeGreaterThanOrEqual(100);
      
      // Check accuracy is reasonable
      const accuracy = parseFloat(result.accuracy);
      expect(accuracy).toBeGreaterThan(0.5); // At least 50% accuracy
      expect(accuracy).toBeLessThanOrEqual(1.0);
      
      console.log('✅ Model trained successfully');
      console.log(`   - Model ID: ${result.modelId}`);
      console.log(`   - Accuracy: ${(accuracy * 100).toFixed(2)}%`);
      console.log(`   - Training size: ${result.trainingDataSize} scans`);
      
      // Clean up mock data
      await db.delete(accessibilityScans).where(
        sql`${accessibilityScans.id} LIKE 'test-scan-%'`
      );
    }, 60000); // 60s timeout for training

  });

  describe('Compliance Prediction', () => {
    
    it('should predict WCAG AA compliance', async () => {
      const htmlStructure = {
        images_without_alt: 2,
        low_contrast_text: 1,
        missing_aria: 3,
        landmarks: 5,
        language: 1,
        headings: 6,
        forms: 2,
        critical_issues: 1,
        serious_issues: 2,
        moderate_issues: 3,
        minor_issues: 5,
      };
      
      const prediction = await predictComplianceIssues(htmlStructure);
      
      expect(prediction).toBeDefined();
      expect(prediction.wcagAA_compliance).toBeDefined();
      expect(prediction.ada_compliance).toBeDefined();
      expect(prediction.predicted_score).toBeDefined();
      expect(prediction.confidence).toBeDefined();
      expect(prediction.risk_level).toBeDefined();
      
      // Check value ranges
      expect(prediction.wcagAA_compliance).toBeGreaterThanOrEqual(0);
      expect(prediction.wcagAA_compliance).toBeLessThanOrEqual(1);
      expect(prediction.ada_compliance).toBeGreaterThanOrEqual(0);
      expect(prediction.ada_compliance).toBeLessThanOrEqual(1);
      expect(prediction.predicted_score).toBeGreaterThanOrEqual(0);
      expect(prediction.predicted_score).toBeLessThanOrEqual(100);
      
      // Check risk level is valid
      expect(['low', 'medium', 'high']).toContain(prediction.risk_level);
      
      console.log('✅ Compliance prediction completed');
      console.log(`   - WCAG AA: ${(prediction.wcagAA_compliance * 100).toFixed(0)}%`);
      console.log(`   - ADA: ${(prediction.ada_compliance * 100).toFixed(0)}%`);
      console.log(`   - Score: ${prediction.predicted_score}/100`);
      console.log(`   - Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
      console.log(`   - Risk: ${prediction.risk_level}`);
    });

    it('should predict high compliance for good structure', async () => {
      const goodStructure = {
        images_without_alt: 0,
        low_contrast_text: 0,
        missing_aria: 0,
        landmarks: 10,
        language: 1,
        headings: 8,
        forms: 3,
        critical_issues: 0,
        serious_issues: 0,
        moderate_issues: 1,
        minor_issues: 2,
      };
      
      const prediction = await predictComplianceIssues(goodStructure);
      
      // Good structure should have high compliance
      expect(prediction.wcagAA_compliance).toBeGreaterThan(0.7);
      expect(prediction.risk_level).toBe('low');
      
      console.log('✅ Good structure prediction: WCAG AA', 
        (prediction.wcagAA_compliance * 100).toFixed(0) + '%');
    });

    it('should predict low compliance for poor structure', async () => {
      const poorStructure = {
        images_without_alt: 50,
        low_contrast_text: 30,
        missing_aria: 40,
        landmarks: 0,
        language: 0,
        headings: 0,
        forms: 0,
        critical_issues: 20,
        serious_issues: 30,
        moderate_issues: 40,
        minor_issues: 50,
      };
      
      const prediction = await predictComplianceIssues(poorStructure);
      
      // Poor structure should have low compliance
      expect(prediction.wcagAA_compliance).toBeLessThan(0.5);
      expect(prediction.risk_level).toBe('high');
      
      console.log('✅ Poor structure prediction: WCAG AA', 
        (prediction.wcagAA_compliance * 100).toFixed(0) + '%');
    });

  });

  describe('New Rule Detection', () => {
    
    it('should detect new compliance rules', async () => {
      // Insert historical rules (WCAG 2.1 only)
      const historicalRules = [
        {
          standard: 'WCAG-2.1',
          ruleId: '1.1.1',
          title: 'Non-text Content',
          description: 'All non-text content has a text alternative',
          level: 'A',
          sourceUrl: 'https://www.w3.org/WAI/WCAG21/quickref/#non-text-content',
        },
      ];
      
      await db.insert(complianceRules).values(historicalRules);
      
      // Current rules include WCAG 2.2 (new rules)
      const currentRules = [
        {
          standard: 'WCAG-2.1',
          ruleId: '1.1.1',
          title: 'Non-text Content',
          description: 'All non-text content has a text alternative',
          level: 'A',
          sourceUrl: 'https://www.w3.org/WAI/WCAG21/quickref/#non-text-content',
        },
        {
          standard: 'WCAG-2.2',
          ruleId: '2.4.11',
          title: 'Focus Appearance (Minimum)',
          description: 'Focus indicator has sufficient contrast and size',
          level: 'AA',
          sourceUrl: 'https://www.w3.org/WAI/WCAG22/quickref/#focus-appearance',
        },
        {
          standard: 'WCAG-2.2',
          ruleId: '3.2.6',
          title: 'Consistent Help',
          description: 'Help mechanisms appear in consistent locations',
          level: 'A',
          sourceUrl: 'https://www.w3.org/WAI/WCAG22/quickref/#consistent-help',
        },
      ];
      
      const newRules = await detectNewComplianceRules(currentRules);
      
      expect(newRules).toBeDefined();
      expect(Array.isArray(newRules)).toBe(true);
      expect(newRules.length).toBe(2); // 2 new WCAG 2.2 rules
      
      // Verify new rules are WCAG 2.2
      expect(newRules.every(r => r.standard === 'WCAG-2.2')).toBe(true);
      
      console.log('✅ New rules detected:', newRules.length);
      newRules.forEach(r => {
        console.log(`   - ${r.ruleId}: ${r.title} (${r.standard})`);
      });
    });

  });

  describe('Quarterly Update Process', () => {
    
    it('should execute quarterly compliance update', async () => {
      // This is the full end-to-end test
      const result = await updateComplianceKnowledge();
      
      expect(result).toBeDefined();
      expect(result.newRulesDetected).toBeDefined();
      expect(result.modelRetrained).toBeDefined();
      
      console.log('✅ Quarterly update completed');
      console.log(`   - New rules detected: ${result.newRulesDetected}`);
      console.log(`   - Model retrained: ${result.modelRetrained ? 'Yes' : 'No'}`);
      
      if (result.modelRetrained) {
        console.log(`   - Previous accuracy: ${result.previousAccuracy}`);
        console.log(`   - New accuracy: ${result.newAccuracy}`);
        console.log(`   - Training data: ${result.trainingDataSize} scans`);
      }
    }, 120000); // 120s timeout for full update

  });

  describe('Active Compliance Rules', () => {
    
    it('should retrieve active compliance rules', async () => {
      const rules = await getActiveComplianceRules();
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      // Group by standard
      const byStandard = rules.reduce((acc, rule) => {
        acc[rule.standard] = (acc[rule.standard] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('✅ Active compliance rules:', rules.length);
      console.log('   Standards breakdown:');
      Object.entries(byStandard).forEach(([standard, count]) => {
        console.log(`   - ${standard}: ${count} rules`);
      });
    });

  });

  describe('Performance & Edge Cases', () => {
    
    it('should handle empty HTML structure gracefully', async () => {
      const emptyStructure = {
        images_without_alt: 0,
        low_contrast_text: 0,
        missing_aria: 0,
        landmarks: 0,
        language: 0,
        headings: 0,
        forms: 0,
        critical_issues: 0,
        serious_issues: 0,
        moderate_issues: 0,
        minor_issues: 0,
      };
      
      const prediction = await predictComplianceIssues(emptyStructure);
      
      expect(prediction).toBeDefined();
      expect(prediction.wcagAA_compliance).toBeDefined();
      
      console.log('✅ Empty structure handled gracefully');
    });

    it('should complete prediction within 500ms', async () => {
      const structure = {
        images_without_alt: 5,
        low_contrast_text: 3,
        missing_aria: 2,
        landmarks: 4,
        language: 1,
        headings: 6,
        forms: 2,
        critical_issues: 2,
        serious_issues: 3,
        moderate_issues: 4,
        minor_issues: 5,
      };
      
      const start = Date.now();
      await predictComplianceIssues(structure);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
      
      console.log(`✅ Prediction latency: ${duration}ms`);
    });

  });

  describe('Integration Tests', () => {
    
    it('should scrape → detect → train → predict (full workflow)', async () => {
      console.log('\n🔄 Running full ML compliance workflow...\n');
      
      // Step 1: Scrape all compliance rules
      console.log('Step 1: Scraping compliance rules...');
      const wcagRules = await scrapeWCAGGuidelines();
      const aodaRules = await scrapeAODARegulations();
      const adaRules = await scrapeADARequirements();
      
      const allRules = [...wcagRules, ...aodaRules, ...adaRules];
      console.log(`✓ Scraped ${allRules.length} total rules`);
      
      // Step 2: Detect new rules
      console.log('\nStep 2: Detecting new rules...');
      const newRules = await detectNewComplianceRules(allRules);
      console.log(`✓ Found ${newRules.length} new rules`);
      
      // Step 3: Store rules in database
      console.log('\nStep 3: Storing rules in database...');
      if (newRules.length > 0) {
        await db.insert(complianceRules).values(newRules);
        console.log(`✓ Stored ${newRules.length} new rules`);
      }
      
      // Step 4: Train model (if new rules or first time)
      console.log('\nStep 4: Training compliance predictor...');
      // Insert mock training data
      const mockScans = Array.from({ length: 100 }, (_, i) => ({
        id: `integration-test-${i}`,
        micrositeId: `test-${i}`,
        score: Math.floor(Math.random() * 40) + 60,
        wcagAA: Math.random() > 0.3,
        wcagAAA: Math.random() > 0.7,
        adaCompliant: Math.random() > 0.4,
        issues: JSON.stringify([]),
        htmlStructure: JSON.stringify({
          images_without_alt: Math.floor(Math.random() * 10),
          low_contrast_text: Math.floor(Math.random() * 5),
          missing_aria: Math.floor(Math.random() * 8),
        }),
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      }));
      
      await db.insert(accessibilityScans).values(mockScans);
      
      const trainingResult = await trainCompliancePredictor();
      console.log(`✓ Model trained with ${trainingResult.trainingDataSize} scans`);
      console.log(`  Accuracy: ${(parseFloat(trainingResult.accuracy) * 100).toFixed(2)}%`);
      
      // Step 5: Make prediction
      console.log('\nStep 5: Making compliance prediction...');
      const testStructure = {
        images_without_alt: 3,
        low_contrast_text: 2,
        missing_aria: 4,
        landmarks: 5,
        language: 1,
        headings: 6,
        forms: 2,
        critical_issues: 1,
        serious_issues: 2,
        moderate_issues: 3,
        minor_issues: 4,
      };
      
      const prediction = await predictComplianceIssues(testStructure);
      console.log(`✓ Prediction complete:`);
      console.log(`  WCAG AA: ${(prediction.wcagAA_compliance * 100).toFixed(0)}%`);
      console.log(`  ADA: ${(prediction.ada_compliance * 100).toFixed(0)}%`);
      console.log(`  Score: ${prediction.predicted_score}/100`);
      console.log(`  Risk: ${prediction.risk_level}`);
      
      // Clean up
      await db.delete(accessibilityScans).where(
        sql`${accessibilityScans.id} LIKE 'integration-test-%'`
      );
      
      console.log('\n✅ Full workflow completed successfully!\n');
      
      // Assertions
      expect(allRules.length).toBeGreaterThan(0);
      expect(trainingResult.accuracy).toBeDefined();
      expect(prediction.wcagAA_compliance).toBeDefined();
    }, 180000); // 3 minute timeout

  });

});
