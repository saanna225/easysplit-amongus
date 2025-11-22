-- Create people/roommates table
CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create bills table
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  receipt_image_url TEXT,
  raw_ocr_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create item assignments (which people are splitting which items)
CREATE TABLE public.item_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id, person_id)
);

-- Enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for people
CREATE POLICY "Users can view their own people"
  ON public.people FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people"
  ON public.people FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own people"
  ON public.people FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own people"
  ON public.people FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for bills
CREATE POLICY "Users can view their own bills"
  ON public.bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills"
  ON public.bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
  ON public.bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
  ON public.bills FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for items (access through bills)
CREATE POLICY "Users can view items from their bills"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = items.bill_id
      AND bills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to their bills"
  ON public.items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = bill_id
      AND bills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items from their bills"
  ON public.items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = items.bill_id
      AND bills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their bills"
  ON public.items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = items.bill_id
      AND bills.user_id = auth.uid()
    )
  );

-- RLS Policies for item_assignments (access through items and bills)
CREATE POLICY "Users can view item assignments from their bills"
  ON public.item_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.bills ON bills.id = items.bill_id
      WHERE items.id = item_assignments.item_id
      AND bills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert item assignments to their bills"
  ON public.item_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.bills ON bills.id = items.bill_id
      WHERE items.id = item_id
      AND bills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update item assignments from their bills"
  ON public.item_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.bills ON bills.id = items.bill_id
      WHERE items.id = item_assignments.item_id
      AND bills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete item assignments from their bills"
  ON public.item_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.bills ON bills.id = items.bill_id
      WHERE items.id = item_assignments.item_id
      AND bills.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_people_user_id ON public.people(user_id);
CREATE INDEX idx_bills_user_id ON public.bills(user_id);
CREATE INDEX idx_items_bill_id ON public.items(bill_id);
CREATE INDEX idx_item_assignments_item_id ON public.item_assignments(item_id);
CREATE INDEX idx_item_assignments_person_id ON public.item_assignments(person_id);