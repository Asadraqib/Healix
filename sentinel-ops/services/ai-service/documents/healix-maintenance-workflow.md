# Healix maintenance workflow reference

This project reference describes how to use Healix records. It is not a machinery manufacturer's service manual and it does not define machine safety limits.

## Alarm response

1. Confirm the machine identity, triggering reading, and last valid telemetry timestamp.
2. Check whether the stream is connected, delayed, or disconnected. Missing data is not a zero reading.
3. Follow the site's approved lockout/tagout procedure before physical inspection or repair.

## Work orders

An automatic work order is created for a critical telemetry incident. The same incident does not create duplicate tickets.

1. Review triggering readings, machine identity, and recommended checks.
2. Assign a technician.
3. Record compatible parts used and associated stock movements.
4. Record completion status after maintenance.

## Inventory

- Record each part issue as a stock movement.
- Reorder suggestions use configured stock levels and unit costs.
- A suggestion is not a purchase order transmitted to a supplier.
- Verify supplier identity, availability, price, and machine compatibility before purchase.

## Data quality

Healix's current Live stream is backend-generated demo telemetry. Treat it as a software demonstration until a machine adapter reports connected-device readings with a trustworthy timestamp and source identifier.

SIMULATION copies the current LIVE records into temporary state. Demonstration changes do not modify LIVE records. Leaving simulation or reloading resets temporary changes.
