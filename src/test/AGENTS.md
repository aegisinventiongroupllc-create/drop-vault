# Test rules
- Live-database tests connect with prepare:false and a 30s timeout. Why: pooled connections drop prepared statements and slow under parallel runs.
