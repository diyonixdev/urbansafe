# Safety Score Tuning Analysis

## Task 2: Current Behavior
Running with default configs (Exp decay, half-life 3 months, 200m buffer, Severity ON).

### Hotspot Route
- **Final Score**: 64 (Moderate Risk)
- **Sub-scores**: Crime (71), Accident (30), Police (100)
- **Decay Stats**: Oldest multiplier applied: 0.067, Newest: 0.718
- **Top Crime Contributors**:
  - ID: C0102, Category: assault, Penalty: 5.28 (Age: 2.8 mo, Decay: 0.53)
  - ID: C0087, Category: robbery, Penalty: 4.07 (Age: 2.9 mo, Decay: 0.51)
  - ID: C0062, Category: harassment, Penalty: 3.58 (Age: 3.5 mo, Decay: 0.45)
  - ID: C0112, Category: robbery, Penalty: 2.87 (Age: 1.4 mo, Decay: 0.72)
  - ID: C0163, Category: other, Penalty: 2.31 (Age: 4.1 mo, Decay: 0.39)
- **Top Accident Contributors**:
  - ID: A0077, Type: hit_and_run, Penalty: 30.00
  - ID: A0103, Type: pedestrian, Penalty: 15.00
  - ID: A0121, Type: pedestrian, Penalty: 15.00

### Clean Route
- **Final Score**: 90 (Low Risk)
- **Sub-scores**: Crime (100), Accident (100), Police (58)
- **Top Crime Contributors**:
- **Top Accident Contributors**:

### Mixed Route
- **Final Score**: 53 (Moderate Risk)
- **Sub-scores**: Crime (69), Accident (0), Police (100)
- **Decay Stats**: Oldest multiplier applied: 0.065, Newest: 0.969
- **Top Crime Contributors**:
  - ID: C0122, Category: harassment, Penalty: 9.69 (Age: 0.1 mo, Decay: 0.97)
  - ID: C0203, Category: vehicle_theft, Penalty: 3.99 (Age: 3.5 mo, Decay: 0.44)
  - ID: C0013, Category: theft, Penalty: 3.36 (Age: 4.7 mo, Decay: 0.34)
  - ID: C0182, Category: assault, Penalty: 2.69 (Age: 4.7 mo, Decay: 0.34)
  - ID: C0226, Category: other, Penalty: 2.45 (Age: 6.9 mo, Decay: 0.20)
- **Top Accident Contributors**:
  - ID: A0003, Type: pedestrian, Penalty: 30.00
  - ID: A0089, Type: two_wheeler, Penalty: 30.00
  - ID: A0094, Type: pedestrian, Penalty: 30.00

## Task 3: Sensitivity Test - Corridor Width

| Route | 100m Width | 200m Width | 400m Width |
|---|---|---|---|
| Hotspot | Score: **85** <br> (C:80, A:80) | Score: **64** <br> (C:71, A:30) | Score: **42** <br> (C:44, A:0) |
| Clean | Score: **90** <br> (C:100, A:100) | Score: **90** <br> (C:100, A:100) | Score: **89** <br> (C:97, A:100) |
| Mixed | Score: **77** <br> (C:95, A:40) | Score: **53** <br> (C:69, A:0) | Score: **36** <br> (C:27, A:0) |

## Task 4: Sensitivity Test - Decay Rate

| Route | Exp (Half-life 1mo) | Exp (Half-life 3mo) | Exp (Half-life 6mo) | Linear (12mo) |
|---|---|---|---|---|
| Hotspot | 73 | 64 | 54 | 57 |
| Clean | 90 | 90 | 90 | 90 |
| Mixed | 60 | 53 | 45 | 46 |

## Task 5: Severity Weighting Check (Hotspot Route)

- **Crime Score (Severity ON)**: 71 (Raw points: 71.33)
- **Crime Score (Severity OFF)**: 78 (Raw points: 77.77)
- **Difference**: If severity weighting is OFF, we see a crime score of 78, whereas with it ON we see 71.

## Task 6: Weight Split Recommendation (For Pedestrians)

Assuming pedestrians/cyclists are the primary users, crime/harassment is a much larger deterrent than minor vehicle accidents. Police proximity remains important for general safety perception.
**Proposed Split**: 50% Crime, 30% Accident, 20% Police Proximity.

| Route | Original (40/35/25) | Proposed (50/30/20) |
|---|---|---|
| Hotspot | 64 | **65** |
| Clean | 90 | **92** |
| Mixed | 53 | **55** |

