-- Remove display_name column from profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS display_name;

-- Update the handle_new_user function to no longer include display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, base_currency, monthly_income_target, backup_mode, username)
    VALUES (
        NEW.id,
        NEW.email,
        'EUR',
        0,
        'automatic',
        COALESCE(NEW.raw_user_meta_data->>'username', NULL)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
