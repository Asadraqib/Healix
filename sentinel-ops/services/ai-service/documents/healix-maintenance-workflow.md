# Healix maintenance workflow reference

This project reference describes how to use Healix records. It is not a machinery manufacturer's service manual and it does not define machine safety limits.

## Alarm response

Confirm an alarm against the current machine state and the timestamp of the last valid telemetry. A delayed or disconnected stream must not be treated as a zero reading. Follow the site's approved lockout/tagout procedure before physical inspection or repair.

## Work orders

An automatic work order is created for a critical telemetry transition. Review the trigger readings, machine identity, and recommended checks before assigning work. Record the technician, parts used, and completion status in the work order.

## Inventory

Record each part issue as a stock movement. Reorder suggestions are based on the part's configured reorder level and unit cost. A suggestion is not a purchase order sent to a supplier; verify supplier identity, availability, price, and compatibility before purchase.

## Data quality

Healix's current Live stream is backend-generated demo telemetry. Treat it as a software demonstration until a machine adapter reports connected-device readings with a trustworthy timestamp and source identifier.
