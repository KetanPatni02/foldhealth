# Phase 01 rollback

Phase 01 only provisions AWS resources. The live Vercel app is untouched; the running Supabase project is untouched. Rollback is "destroy the AWS resources."

## When to roll back

- RDS restore keeps failing with schema errors you can't reconcile against the Supabase export.
- PostgREST on ECS can't validate Supabase JWTs after you've checked the secret twice.
- You decide to pause the migration for weeks and want the AWS bill to drop to zero.

## Procedure

1. **Confirm no app traffic has been pointed at the new ALB.** If Phase 01-B has shipped and the app is reading from the new PostgREST, DO NOT run this; roll back Phase 01-B first (revert the `VITE_API_URL` change).

2. **Lift RDS deletion protection.** Terraform leaves it on by default to prevent accidents.

   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier foldhealth-prod-postgres \
     --no-deletion-protection \
     --apply-immediately
   ```

3. **Run `terraform destroy`.** This takes 10-15 minutes.

   ```bash
   cd infra/terraform
   terraform destroy
   ```

   RDS will create a final snapshot named `foldhealth-prod-postgres-final-YYYYMMDD-hhmmss` before deletion. You can later restore from it with `aws rds restore-db-instance-from-db-snapshot`.

4. **Secrets Manager has a 7-day recovery window.** If you later realize you need the RDS password or the JWT secret back:

   ```bash
   aws secretsmanager restore-secret --secret-id foldhealth-prod-rds-master-password
   aws secretsmanager restore-secret --secret-id foldhealth-prod-postgrest-jwt-secret
   ```

5. **CloudWatch log group is retained.** Delete manually if you want to reclaim the (tiny) storage:

   ```bash
   aws logs delete-log-group --log-group-name /aws/ecs/foldhealth-prod-postgrest
   ```

## What survives

- The RDS final snapshot (indefinitely until you delete it; around $0.095/GB-month).
- Secrets Manager secrets within the 7-day recovery window.
- CloudWatch log group until manually deleted.
- Terraform state file (local). Delete `infra/terraform/terraform.tfstate*` if you want a totally clean slate.

Nothing else survives.

## Verifying zero cost

```bash
aws ec2 describe-vpcs --filters Name=tag:project,Values=foldhealth --query 'Vpcs[*].VpcId'
aws rds describe-db-instances --query 'DBInstances[?DBInstanceIdentifier==`foldhealth-prod-postgres`].DBInstanceStatus'
aws ecs list-clusters --query 'clusterArns[?contains(@, `foldhealth`)]'
aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `foldhealth`)].LoadBalancerName'
```

All four should return empty.

## Starting over

If you want to re-apply Phase 01 after a destroy, you need to re-export the Supabase DB first (unless the previous dump is still in `~/foldhealth-migration/`), then follow [01-rds-postgrest.md](01-rds-postgrest.md) from Step 1.
