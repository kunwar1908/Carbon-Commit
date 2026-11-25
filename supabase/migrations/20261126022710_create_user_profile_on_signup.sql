CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  full_name_value text;
BEGIN
  full_name_value := regexp_replace(
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  );

  IF full_name_value = '' OR full_name_value !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'A non-empty full name is required to create an account.';
  END IF;

  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'An email address is required to create a user profile.';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id::text, NEW.email, full_name_value);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();
