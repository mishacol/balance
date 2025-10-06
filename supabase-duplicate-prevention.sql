-- =============================================
-- DUPLICATE PREVENTION SCHEMA UPDATES
-- =============================================

-- 1. Add index for faster duplicate detection (but allow duplicates)
-- This helps with performance but doesn't prevent duplicates
CREATE INDEX IF NOT EXISTS idx_transactions_content_lookup 
ON public.transactions (user_id, type, amount, currency, category, description, date);

-- 2. Add index for timestamp-based duplicate detection
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp_lookup 
ON public.transactions (user_id, created_at);

-- 3. Add function to detect accidental duplicates (within time window)
CREATE OR REPLACE FUNCTION detect_accidental_duplicate(
  p_user_id UUID,
  p_type TEXT,
  p_amount DECIMAL,
  p_currency TEXT,
  p_category TEXT,
  p_description TEXT,
  p_date DATE,
  p_time_window_minutes INTEGER DEFAULT 5
) RETURNS TABLE(
  is_accidental_duplicate BOOLEAN,
  existing_transaction_id UUID,
  time_diff_minutes INTEGER
) AS $$
DECLARE
  existing_transaction RECORD;
  time_diff INTEGER;
BEGIN
  -- Check if identical transaction exists within the time window
  SELECT id, created_at INTO existing_transaction
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = p_type
    AND amount = p_amount
    AND currency = p_currency
    AND category = p_category
    AND description = p_description
    AND date = p_date
    AND created_at > NOW() - INTERVAL '1 minute' * p_time_window_minutes
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_transaction.id IS NOT NULL THEN
    -- Calculate time difference
    time_diff := EXTRACT(EPOCH FROM (NOW() - existing_transaction.created_at)) / 60;
    
    RETURN QUERY SELECT 
      TRUE,
      existing_transaction.id,
      time_diff::INTEGER;
  ELSE
    RETURN QUERY SELECT 
      FALSE,
      NULL::UUID,
      0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add function to safely insert transactions (always allows insertion)
CREATE OR REPLACE FUNCTION safe_insert_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount DECIMAL,
  p_currency TEXT,
  p_category TEXT,
  p_description TEXT,
  p_date DATE
) RETURNS TABLE(
  id UUID,
  action TEXT,
  message TEXT
) AS $$
DECLARE
  new_transaction_id UUID;
BEGIN
  -- Always insert the transaction (intentional duplicates are allowed)
  INSERT INTO public.transactions (
    user_id, type, amount, currency, category, description, date
  ) VALUES (
    p_user_id, p_type, p_amount, p_currency, p_category, p_description, p_date
  ) RETURNING id INTO new_transaction_id;
  
  RETURN QUERY SELECT 
    new_transaction_id,
    'inserted'::TEXT,
    'Transaction created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add RLS policy for the new function
CREATE POLICY "Users can use safe_insert_transaction" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Create function to clean up existing duplicates (one-time cleanup)
CREATE OR REPLACE FUNCTION cleanup_duplicate_transactions()
RETURNS TABLE(
  duplicates_removed INTEGER,
  message TEXT
) AS $$
DECLARE
  duplicate_count INTEGER := 0;
BEGIN
  -- Delete duplicates, keeping the oldest one (by created_at)
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id, type, amount, currency, category, description, date 
             ORDER BY created_at ASC
           ) as rn
    FROM public.transactions
  )
  DELETE FROM public.transactions 
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS duplicate_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    duplicate_count,
    'Cleaned up ' || duplicate_count || ' duplicate transactions'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION safe_insert_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_transactions TO authenticated;
