export interface RoleCategory {
  category: string;
  description: string;
  roles: string[];
}

export const EVENT_ROLE_CATEGORIES: RoleCategory[] = [
  {
    category: "Event Setup & Infrastructure",
    description: "Venue prep, stage building, sound/light installation, and teardown",
    roles: [
      "Stage Setup Worker",
      "Stage Carpenter",
      "Stage Fabrication Worker",
      "Lighting Setup Technician",
      "Sound System Setup Technician",
      "LED Screen Installation Technician",
      "Truss Installation Worker",
      "Tent / Canopy Setup Worker",
      "Electrical Technician",
      "Generator Operator",
      "Cable Management Technician",
      "Furniture Setup Worker",
      "Venue Setup Crew",
      "Dismantling / Teardown Worker",
    ],
  },
  {
    category: "Registration & Guest Management",
    description: "Welcoming guests, attendees, VIP handling, badges and ticketing",
    roles: [
      "Registration Desk Staff",
      "Ticket Scanner",
      "Ticket Verification Staff",
      "Guest Check-in Staff",
      "Welcome Desk Staff",
      "Guest Relations Executive",
      "VIP Guest Handler",
      "Invitation Verification Staff",
      "Badge / Wristband Distribution Staff",
      "Information Desk Staff",
      "Queue Management Staff",
    ],
  },
  {
    category: "Crowd Management & Security",
    description: "Crowd safety, access control, barricades and venue security",
    roles: [
      "Crowd Control Staff",
      "Event Security Guard",
      "Gate Security",
      "Entry / Exit Monitor",
      "Bag Check Staff",
      "Barricade Management Staff",
      "Parking Security",
      "VIP Security Support",
      "Floor Security Staff",
      "Crowd Marshal",
    ],
  },
  {
    category: "Stage & Production",
    description: "Stage performances, artist handling, audio/visuals, spotlights",
    roles: [
      "Stage Assistant",
      "Backstage Assistant",
      "Stage Manager Assistant",
      "Artist / Performer Assistant",
      "Green Room Assistant",
      "Sound Technician",
      "Audio Mixer",
      "Lighting Technician",
      "Spotlight Operator",
      "LED Wall Operator",
      "Video Technician",
      "Camera Operator",
      "Teleprompter Operator",
      "AV Technician",
      "DJ Assistant",
      "Stage Runner",
      "Props Handler",
    ],
  },
  {
    category: "Food & Hospitality",
    description: "Catering, beverages, buffets, dining hospitality and refreshments",
    roles: [
      "Catering Server",
      "Food Service Staff",
      "Beverage Server",
      "Buffet Attendant",
      "Kitchen Helper",
      "Dishwashing Staff",
      "Food Counter Staff",
      "Hospitality Assistant",
      "VIP Hospitality Staff",
      "Hospitality Coordinator",
      "Water Distribution Staff",
      "Tea / Coffee Counter Staff",
    ],
  },
  {
    category: "Logistics & Operations",
    description: "Loading, unloading, warehouse, inventory and on-ground logistics",
    roles: [
      "Event Runner",
      "Logistics Assistant",
      "Warehouse Assistant",
      "Equipment Handler",
      "Loading / Unloading Worker",
      "Delivery Coordinator",
      "Inventory Assistant",
      "Material Distribution Staff",
      "Transport Coordinator",
      "Vendor Coordination Assistant",
      "Operations Assistant",
      "Floor Operations Assistant",
    ],
  },
  {
    category: "Photography, Media & Content",
    description: "Photographers, videographers, social media creators, drone operators",
    roles: [
      "Event Photographer",
      "Event Videographer",
      "Camera Assistant",
      "Photography Assistant",
      "Social Media Handler",
      "Social Media Content Creator",
      "Reels Creator",
      "Live Streaming Operator",
      "Video Editing Assistant",
      "Media Desk Assistant",
      "Press Coordination Assistant",
      "Drone Operator",
    ],
  },
  {
    category: "Marketing & Promotion",
    description: "Flyers, brand ambassadors, booth activations, surveys and mascots",
    roles: [
      "Event Promoter",
      "Flyer Distribution Staff",
      "Brand Promoter",
      "Promotional Booth Staff",
      "Sponsor Activation Staff",
      "Product Demonstrator",
      "Lead Collection Staff",
      "Survey Collection Staff",
      "Mascot Performer",
      "Sampling Staff",
      "Sales Booth Assistant",
    ],
  },
  {
    category: "Parking & Transportation",
    description: "Valet parking, traffic marshals, shuttle buses and drivers",
    roles: [
      "Parking Attendant",
      "Parking Coordinator",
      "Valet Parking Staff",
      "Vehicle Entry Monitor",
      "Traffic Marshal",
      "Shuttle Coordinator",
      "Transport Assistant",
      "Driver",
      "Pickup / Drop Coordination Staff",
    ],
  },
  {
    category: "Cleaning & Maintenance",
    description: "Housekeeping, washroom upkeep, spill response and post-event cleanup",
    roles: [
      "Event Cleaner",
      "Housekeeping Staff",
      "Washroom Maintenance Staff",
      "Waste Collection Staff",
      "Waste Segregation Staff",
      "Cleaning Supervisor",
      "Venue Maintenance Assistant",
      "Spill Cleanup Staff",
      "Post-event Cleaning Crew",
    ],
  },
  {
    category: "Medical & Safety",
    description: "First aid, emergency medical, fire safety and marshals",
    roles: [
      "First Aid Staff",
      "Medical Assistant",
      "EMT / Paramedic",
      "Event Nurse",
      "Ambulance Driver",
      "Fire Safety Personnel",
      "Fire Marshal",
      "Safety Officer",
      "Emergency Response Staff",
    ],
  },
  {
    category: "Exhibition & Booth Management",
    description: "Expo stalls, booth sales, product demos, registration and decor",
    roles: [
      "Exhibition Booth Assistant",
      "Stall Setup Worker",
      "Stall Dismantling Worker",
      "Exhibitor Support Staff",
      "Booth Sales Assistant",
      "Product Demo Assistant",
      "Exhibition Registration Staff",
      "Booth Electrical Technician",
      "Booth Decor Assistant",
      "Exhibition Floor Assistant",
    ],
  },
  {
    category: "Decor & Creative Setup",
    description: "Floral decor, balloons, banners, backdrops and event styling",
    roles: [
      "Event Decor Assistant",
      "Balloon Decorator",
      "Floral Decor Assistant",
      "Banner Installer",
      "Signage Installer",
      "Backdrop Setup Worker",
      "Art Installation Assistant",
      "Event Stylist Assistant",
    ],
  },
  {
    category: "Event Administration",
    description: "Event coordination, attendance, wage records and helpdesk",
    roles: [
      "Event Coordinator Assistant",
      "Event Admin Assistant",
      "Data Entry Operator",
      "Attendance Tracker",
      "Staff Check-in Coordinator",
      "Payroll / Wage Record Assistant",
      "Documentation Assistant",
      "Event Helpdesk Staff",
      "Feedback Collection Staff",
      "Shift Coordinator",
    ],
  },
];

export interface RoleSuggestion {
  role: string;
  category: string;
}

// Flat list of all roles with category
export const ALL_EVENT_ROLES: RoleSuggestion[] = EVENT_ROLE_CATEGORIES.flatMap((c) =>
  c.roles.map((r) => ({ role: r, category: c.category }))
);

// Helper function to search roles matching query
export function filterRoles(query: string, limit = 12): RoleSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Return popular/first suggestions
    return ALL_EVENT_ROLES.slice(0, limit);
  }
  return ALL_EVENT_ROLES.filter(
    (item) =>
      item.role.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  ).slice(0, limit);
}
