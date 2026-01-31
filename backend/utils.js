function calculateTotal(baseFlightPrice, passengersCount, extras = {}) {
  const basePrice = baseFlightPrice * passengersCount;
  let extraPrice = 0;

  if (extras.meal) extraPrice += 20 * passengersCount;
  if (extras.insurance) extraPrice += 15 * passengersCount;
  if (extras.upgrade) extraPrice += 50 * passengersCount;

  return {
    basePrice,
    extraPrice,
    totalPrice: basePrice + extraPrice,
  };
}

module.exports = { calculateTotal };
