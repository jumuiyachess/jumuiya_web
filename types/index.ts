export interface Tournament {
  id: string;
  name: string;
  slug?: string;
  poster_url?: string;
  event_date: string;
  venue: string;
  categories: string[];
  entry_fee: number;
  description: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  max_participants?: number;
  registration_deadline?: string;
  terms_url?: string;
  registrations_count?: number;
  created_at?: string;
}

export interface Registration {
  id: string;
  tournament_id: string;
  player_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  age: number;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  fide_id?: string;
  school?: string;
  category: string;
  phone_number: string;
  accompanying_person?: string;
  consent_given?: boolean;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  checkout_request_id?: string;
  mpesa_receipt?: string;
  ticket_number?: string;
  attendance_status?: 'registered' | 'checked-in';
  created_at?: string;
  tournaments?: {
    name: string;
  };
}

export interface Product {
  id: string;
  name: string;
  image_url: string;
  images?: string[];
  price: number;
  description: string;
  in_stock: boolean;
  created_at?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  featured_image_url?: string;
  excerpt: string;
  body: string;
  published: boolean;
  published_at?: string;
  source_url?: string;
  created_at?: string;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  caption: string;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  sort_order?: number;
  created_at?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export interface ImpactProgram {
  id: string;
  title: string;
  description: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  created_at?: string;
}

export interface SiteSettings {
  id: number;
  org_email: string;
  org_phone: string;
  mpesa_paybill: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  shop_enabled: boolean;
  our_story_title?: string;
  our_story_heading?: string;
  our_story_paragraph_1?: string;
  our_story_paragraph_2?: string;
  tournament_preset_categories?: string[];
  updated_at?: string;
}

export interface ShopOrder {
  id: string;
  customer_name: string;
  phone_number: string;
  email?: string;
  shipping_address?: string;
  city?: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  delivery_status: 'pending' | 'processing' | 'shipped' | 'delivered';
  delivery_notes?: string;
  checkout_request_id?: string;
  mpesa_receipt?: string;
  created_at?: string;
}

export interface Video {
  id: string;
  title: string;
  youtube_url: string;
  description: string;
  is_featured: boolean;
  created_at?: string;
}

export interface PolicySection {
  title: string;
  content: string;
}

export interface SitePolicy {
  id: string;
  title: string;
  subtitle?: string;
  lead_text?: string;
  content?: string;
  sections: PolicySection[];
  updated_at?: string;
}

export interface Donation {
  id: string;
  donor_name?: string;
  email?: string;
  phone_number: string;
  amount: number;
  donor_message?: string;
  payment_channel: string;
  payment_status: 'pending' | 'completed' | 'failed';
  checkout_request_id?: string;
  mpesa_receipt?: string;
  created_at: string;
}

