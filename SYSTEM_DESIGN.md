# System Design Document: Last-Mile Delivery Management Platform

## 1. Rate Calculation Engine
The Rate Engine determines shipping costs by standardizing volumetric density and distance tiering:

- **Dimensional Standardization**:
  $$\text{Volumetric Weight} = \frac{\text{Length (cm)} \times \text{Breadth (cm)} \times \text{Height (cm)}}{5000}$$
  $$\text{Billable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
- **Tariff Matrix Resolution**:
  The system resolves shipping tier combinations across Order Type (`B2B` vs. `B2C`) and Geographic Proximity (`Intra-Zone` vs. `Inter-Zone`). 
- **Cost Formulation**:
  $$\text{Total Cost} = \text{Base Price} + (\text{Billable Weight} \times \text{Rate per kg}) + \text{COD Surcharge}$$
  Pricing lookup tables are modular, allowing administrators to modify rate cards dynamically without code redeployment.

## 2. Zone Detection Approach
Geographic routing relies on a structured hierarchy mapping pincodes to operational logistics zones:

- **Mapping Resolution**:
  Every 6-digit postal code maps to a parent `Zone` entity in the `zone_areas` repository.
- **Relational Matrix**:
  During order placement, the system evaluates both `pickup_pincode` and `drop_pincode`.
  - **Intra-Zone Routing**: When both pincodes map to the same `zone_id`.
  - **Inter-Zone Routing**: When pincodes map to different `zone_id` entries.
- **Fallbacks & Extensibility**:
  Unmapped pincodes default to a designated regional transit hub zone, ensuring no order placement fails due to spatial edge cases.

## 3. Auto-Assignment Logic
Dispatching follows a greedy load-balancing algorithm designed to optimize agent availability and territory containment:

- **Zone Matching**:
  The dispatch engine filters candidate agents based on the shipment's origin `pickup_zone_id`.
- **Availability & Capacity Filter**:
  Only agents flagged with `is_available = true` and active load count below maximum capacity are shortlisted.
- **Least-Loaded Dispatch**:
  Among qualified candidates, the agent with the lowest number of pending shipments is selected:
  $$\text{Assigned Agent} = \arg\min_{a \in \text{EligibleAgents}} (\text{ActiveOrdersCount}(a))$$
- **Concurrency Protection**:
  Database transactions prevent race conditions when multiple orders are assigned simultaneously. If no agent is available, the shipment enters an `Unassigned` pool in the Control Tower for admin manual assignment.

## 4. Failed Delivery Handling
Failed delivery attempts follow a strict audit and recovery lifecycle to maintain data integrity:

- **State Transition & Audit**:
  Agents must supply a mandatory failure reason note when marking an order as `Failed`. The state transition is logged in `order_status_log`. PostgreSQL database rules enforce immutability, preventing updates or deletions to audit history.
- **Customer Rescheduling Workflow**:
  Flagging an order as `Failed` triggers an automated notification and unlocks a customer portal action. Customers can select a preferred date for re-attempt and provide delivery instructions.
- **Re-Dispatch Pipeline**:
  Upon reschedule submission, the order returns to `Created` status with an updated schedule timestamp, re-entering the dispatch pipeline for the next delivery window.
