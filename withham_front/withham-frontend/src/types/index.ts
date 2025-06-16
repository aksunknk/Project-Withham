// src/types/index.ts

export type UserProfile = {
    bio: string | null;
    avatar: string | null;
  };
  
  export type SimpleUser = {
    id: number;
    username: string;
    profile: {
      avatar: string | null;
    };
  };
  
  export type BaseHamster = {
    id: number;
    owner: number;
    name: string;
    breed: string | null;
    birthday: string | null;
    gender: 'M' | 'F' | 'U';
    profile_text: string | null;
    profile_image: string | null;
  };
  
  export type Post = {
    id: number;
    author: SimpleUser;
    text: string;
    image: string | null;
    created_at: string;
    likes_count: number;
    is_liked: boolean;
    hamster: BaseHamster | null;
    comments?: Comment[]; // ★ コメントは常に存在するとは限らないためオプショナルにする
  };
  
  export type UserDetail = {
    id: number;
    username: string;
    profile: UserProfile;
    posts: Post[];
    followers_count: number;
    following_count: number;
    is_following: boolean;
  };

  export type HealthLog = {
    id: number;
    log_date: string;
    weight_g: string | null;
    notes: string | null;
    created_at: string;
  };

  export type Hamster = BaseHamster;

  export type HamsterDetail = BaseHamster & {
    health_logs: HealthLog[];
  };

  export type UserListItem = {
    id: number;
    username: string;
    profile: {
      avatar: string | null;
    };
    is_following: boolean;
  };

  export type Comment = {
    id: number;
    author: SimpleUser;
    text: string;
    created_at: string;
    post: number;
    
  };

  export type Answer = {
    id: number;
    user: SimpleUser;
    text: string;
    created_at: string;
    is_best_answer: boolean;
};

export type Question = {
    id: number;
    title: string;
    user: SimpleUser;
    created_at: string;
    is_resolved: boolean;
    answers_count: number;
};

export type QuestionDetail = Question & {
    text: string;
    answers: Answer[];
};
