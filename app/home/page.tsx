// app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle'; // Import theme toggle
import {
    LayoutDashboard,
    Package,
    Store,
    BarChart3,
    Settings,
    Receipt, // Billing icon
    LogIn,
    UserPlus,
    MapPin, // Location icon
    Database, // Master Data icon
    SunMoon, // Dark mode icon
} from 'lucide-react';

// Define features to showcase
const features = [
    {
        icon: LogIn,
        title: "Secure Authentication",
        description: "User login and sign-up managed securely via Supabase Auth, including email confirmation.",
    },
    {
        icon: LayoutDashboard,
        title: "Insightful Dashboard",
        description: "Get an overview of store details, inventory counts, and key sales data at a glance.",
    },
    {
        icon: Store,
        title: "Easy Store Setup",
        description: "Quickly configure your store name, address, and precise location using an interactive map.",
    },
    {
        icon: Package,
        title: "Medicine Management",
        description: "Search a master medicine list, manage batches, track quantities, prices, and expiry dates.",
    },
     {
        icon: MapPin,
        title: "Location Aware",
        description: "Set and visualize your exact store location using Google Maps integration with search.",
    },
    {
        icon: Receipt,
        title: "Streamlined Billing",
        description: "Generate bills effortlessly. Inventory updates automatically with each sale.",
    },
    {
        icon: BarChart3,
        title: "Reports & Analytics",
        description: "Gain insights with reports on inventory levels (low stock, expiring soon) and sales performance.",
    },
     {
        icon: SunMoon,
        title: "Dark Mode",
        description: "Switch between light and dark themes for comfortable viewing, day or night.",
    },
    {
        icon: Settings,
        title: "Customizable Settings",
        description: "Manage account details, application preferences, and sync options.",
    },
    {
        icon: Database,
        title: "Cloud Synced",
        description: "All your data is securely stored and synced in real-time using Supabase.",
    },
];


export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* Optional: Add a logo here */}
            {/* <YourLogo className="h-6 w-6" /> */}
            <span className="font-bold">PharmaCRM</span>
          </Link>
          <nav className="flex items-center gap-4">
             <ThemeToggle /> {/* Add theme toggle to header */}
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
               <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-b">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Manage Your Pharmacy Effortlessly
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    PharmaCRM provides a simple, cloud-synced solution for inventory management, billing, and reporting for your pharmacy store.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/login">
                        <LogIn className="mr-2 h-5 w-5" /> Login Now
                    </Link>
                  </Button>
                   <Button variant="secondary" size="lg" asChild>
                     <Link href="/signup">
                        <UserPlus className="mr-2 h-5 w-5" /> Create Account
                    </Link>
                  </Button>
                </div>
              </div>
              {/* Optional: Add an image/illustration here */}
              <img
                alt="Hero"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square opacity-80 hidden lg:block" // Hide on small screens
                height="550"
                src="/placeholder.svg" // Replace with your actual image path or remove
                width="550"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Succeed</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From stock management to billing and analytics, PharmaCRM simplifies your pharmacy operations.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-start space-y-2 rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                   <div className="bg-primary/10 p-2 rounded-full mb-2">
                     <feature.icon className="h-6 w-6 text-primary" />
                   </div>
                   <h3 className="text-lg font-bold">{feature.title}</h3>
                   <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA (Optional) */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
           <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
             <div className="space-y-3">
               <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Ready to Streamline Your Pharmacy?</h2>
               <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                 Sign up today and take control of your inventory and sales.
               </p>
             </div>
             <div className="flex justify-center gap-4">
                 <Button size="lg" asChild>
                    <Link href="/signup">Get Started Free</Link>
                 </Button>
                  <Button variant="outline" size="lg" asChild>
                     <Link href="/login">Login</Link>
                 </Button>
             </div>
           </div>
         </section>

      </main>

      {/* Footer */}
       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
         <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PharmaCRM. All rights reserved.</p>
         <nav className="sm:ml-auto flex gap-4 sm:gap-6">
           {/* Optional Footer Links */}
           {/* <Link className="text-xs hover:underline underline-offset-4" href="#">Terms of Service</Link>
           <Link className="text-xs hover:underline underline-offset-4" href="#">Privacy</Link> */}
         </nav>
       </footer>
    </div>
  );
}