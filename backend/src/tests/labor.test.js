// ... existing code ...
      expect(res.body.data.costPerHour).toBe(updatePayload.costPerHour);
      expect(res.body.data.minutesPerPie).toBe(updatePayload.minutesPerPie);
      expect(res.body.data.laborCostPerPie).toBeCloseTo(5.6, 2); // Verify recalculated cost within precision
      expect(res.body.data.pieName).toBe(laborData.pieName); // Name shouldn't change

      // Verify in DB
      const updatedLabor = await Labor.findById(laborId);
      expect(updatedLabor.costPerHour).toBe(updatePayload.costPerHour);
      expect(updatedLabor.laborCostPerPie).toBeCloseTo(5.6, 2);
    });
// ... existing code ...
