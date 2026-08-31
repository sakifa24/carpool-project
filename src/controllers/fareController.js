exports.calculateFareSplit = (req, res) => {
  try {
    const { total_fare, num_passengers, vehicle_type } = req.body;

    const fare = parseFloat(total_fare);
    const passengers = parseInt(num_passengers) || 2;

    if (isNaN(fare) || fare <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive total fare amount.' });
    }

    if (isNaN(passengers) || passengers < 1 || passengers > 6) {
      return res.status(400).json({ error: 'Number of passengers must be between 1 and 6.' });
    }

    const farePerPerson = (fare / passengers).toFixed(2);
    const soloFare = fare.toFixed(2);
    const totalSavingsPerPerson = (fare - (fare / passengers)).toFixed(2);
    const percentSaved = (((fare - (fare / passengers)) / fare) * 100).toFixed(1);

    // Generate full tier table for 1 to 4 passengers
    const tiers = [];
    for (let count = 1; count <= 4; count++) {
      const split = (fare / count).toFixed(2);
      const saved = (fare - (fare / count)).toFixed(2);
      tiers.push({
        passengers: count,
        fare_per_person: parseFloat(split),
        savings_per_person: parseFloat(saved),
        discount_percent: `${(((fare - (fare / count)) / fare) * 100).toFixed(0)}%`
      });
    }

    res.json({
      total_fare: fare,
      selected_passengers: passengers,
      vehicle_type: vehicle_type || 'cng',
      fare_per_person: parseFloat(farePerPerson),
      solo_fare: parseFloat(soloFare),
      savings_per_person: parseFloat(totalSavingsPerPerson),
      percent_saved: `${percentSaved}%`,
      split_tiers: tiers
    });
  } catch (err) {
    console.error('Calculate fare split error:', err);
    res.status(500).json({ error: 'Failed to calculate fare split.' });
  }
};

exports.getCampusRouteEstimates = (req, res) => {
  // Preset benchmarks for common university commutes
  const routes = [
    { destination: 'Dhanmondi (Sankar / 27 / 8A)', auto: 180, cng: 220, car: 320 },
    { destination: 'Gulshan 1 & 2', auto: 120, cng: 160, car: 240 },
    { destination: 'Banani (11 / Supermarket)', auto: 100, cng: 140, car: 200 },
    { destination: 'Uttara (Sector 3 - 14)', auto: 250, cng: 320, car: 450 },
    { destination: 'Mirpur (10 / 1 / DOHS)', auto: 180, cng: 240, car: 340 },
    { destination: 'Bashundhara R/A / Kuril', auto: 140, cng: 190, car: 280 },
    { destination: 'Mohakhali / Farmgate', auto: 80, cng: 120, car: 180 }
  ];

  res.json(routes);
};
