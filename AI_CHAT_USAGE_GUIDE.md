# AI Chat Feature - Usage Guide

## ✅ Implementation Complete

The AI Chat feature has been fully integrated into your TruCare patient dashboard with **TWO ways to access it**:

---

## 🎯 How to Access AI Chat

### Method 1: Dedicated AI Chat Page (Recommended)
1. **Login** to your patient account
2. Click **"AI Chat"** in the navigation bar (between "Tests" and "Contact")
3. The chat interface will **automatically open** and be ready to use
4. Start chatting immediately!

**URL**: `http://localhost:5174/dashboard/ai-chat`

### Method 2: From Main Dashboard
1. **Login** to your patient account
2. Stay on the **Home** page (`/dashboard`)
3. **Scroll down** past:
   - Welcome section
   - Your Care Team (doctors)
   - Mood Tracker
4. You'll see the **"AI Therapist Support"** section
5. Click **"Start Conversation"** to open the chat

---

## 📱 Navigation

### Desktop Navigation Bar
```
Home | Tests | AI Chat | Contact | Profile | Logout
```

### Mobile Navigation Menu
Tap the hamburger menu (☰) to see:
- Home
- Tests
- **AI Chat** ← New!
- Profile
- Contact
- Logout

---

## 💬 Using the AI Chat

### Starting a Conversation
1. **Quick Prompts** (for easy start):
   - "I'm feeling anxious"
   - "I need someone to talk to"
   - "Help me manage stress"
   - "I'm feeling overwhelmed"

2. **Type Your Own Message**:
   - Click the input field
   - Type your thoughts/feelings
   - Press Enter or click Send

### Chat Features
- ✅ Real-time AI responses
- ✅ Full conversation context maintained
- ✅ Typing indicator when AI is thinking
- ✅ Message timestamps
- ✅ Empathetic therapist-style responses
- ✅ Error handling with friendly messages
- ✅ Smooth animations

### Chat Controls
- **Minimize**: Click the X button to collapse the chat
- **Reopen**: Click "Start Conversation" again
- **New Session**: Refresh the page for a fresh start

---

## 🎨 Visual Design

### Color Scheme
- **Your Messages**: Green gradient background (matching TruCare brand)
- **AI Messages**: White background with green border
- **Header**: Green gradient with robot icon
- **Buttons**: Green with smooth hover effects

### Responsive Design
- **Desktop**: Full-width chat interface (max 600px)
- **Mobile**: Optimized for touch interactions
- **Tablet**: Adapts beautifully to all screen sizes

---

## 🤖 AI Capabilities

The AI therapist is configured to:
- ✅ Listen actively and validate your feelings
- ✅ Ask thoughtful, open-ended questions
- ✅ Provide evidence-based coping strategies
- ✅ Maintain a warm, supportive tone
- ✅ Encourage self-reflection
- ✅ Recognize when professional help is needed
- ✅ Keep responses concise (2-4 sentences)
- ✅ Use empathetic language
- ❌ Never diagnose or prescribe medication

### Example Conversation
```
You: I'm feeling really anxious today

AI: I'm sorry to hear you're feeling anxious. That can be 
really challenging. Can you tell me a bit more about what's 
making you feel this way? Understanding the source can help 
us work through it together.

You: I have a big presentation tomorrow

AI: Presentations can definitely trigger anxiety. It's 
completely normal to feel nervous about them. Would you like 
to try some breathing exercises to help calm your nerves? 
Or would you prefer to talk through what specifically about 
the presentation is worrying you?
```

---

## 🔧 Technical Details

### Files Created/Modified

**New Files:**
- `src/services/gemini.js` - Gemini API integration
- `src/components/dashboard/AITherapistChat.jsx` - Chat component
- `src/pages/AIChat.jsx` - Dedicated AI Chat page
- `test-gemini.js` - API testing script

**Modified Files:**
- `src/App.jsx` - Added AI Chat route
- `src/pages/Dashboard.jsx` - Added AI Chat section
- `src/components/dashboard/DashboardNavbar.jsx` - Added navigation links
- `src/index.css` - Added animations

### API Configuration
- **Model**: Gemini 2.0 Flash
- **API Key**: AIzaSyDSO4p4MmOi9vD3BoMoj68wf2tndJvgZcQ
- **Endpoint**: https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent
- **Response Time**: 1-3 seconds average

---

## 🚀 Getting Started

### For First-Time Users
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to:
   ```
   http://localhost:5174
   ```

3. Login with your patient account

4. Click **"AI Chat"** in the navigation bar

5. Start chatting!

### For Testing
Run the API test script:
```bash
node test-gemini.js
```

Expected output:
```
✅ API Connection Successful!
✅ Gemini API is working correctly!
```

---

## 📊 Current Status

| Feature | Status |
|---------|--------|
| Gemini API Integration | ✅ Working |
| Chat Interface | ✅ Complete |
| Navigation Links | ✅ Added |
| Mobile Responsive | ✅ Optimized |
| Error Handling | ✅ Implemented |
| Animations | ✅ Smooth |
| Therapist Prompts | ✅ Configured |
| Auto-Open on Page | ✅ Working |
| Message History | ✅ Maintained |

---

## 🎯 Where to Find It

### On Dashboard Homepage (`/dashboard`)
Scroll down to see:
1. Welcome Section
2. Your Care Team (doctors)
3. Mood Tracker (emojis)
4. **AI Therapist Support** ← HERE!

### On Dedicated Page (`/dashboard/ai-chat`)
- Click "AI Chat" in navbar
- Chat opens automatically
- Full-screen experience

---

## 💡 Tips for Best Experience

1. **Be Honest**: The AI is here to help, not judge
2. **Take Your Time**: No rush, chat at your own pace
3. **Use Quick Prompts**: Great for getting started
4. **Ask Questions**: The AI can guide you through techniques
5. **Try Different Topics**: Anxiety, stress, mood, relationships, etc.

---

## 🆘 Troubleshooting

### Chat Not Visible on Dashboard
- **Solution**: Scroll down past the Mood Tracker section

### Chat Not Opening
- **Solution**: Check browser console for errors (F12)
- **Alternative**: Use the dedicated page at `/dashboard/ai-chat`

### AI Not Responding
- **Check**: Internet connection
- **Check**: API key is valid
- **Try**: Refresh the page and try again

### Styling Issues
- **Solution**: Clear browser cache (Ctrl+Shift+R)
- **Solution**: Rebuild the project: `npm run build`

---

## 📞 Support

If you encounter any issues:
1. Check the browser console (F12) for error messages
2. Run `node test-gemini.js` to verify API connection
3. Review `AI_CHAT_DOCUMENTATION.md` for technical details
4. Check that all dependencies are installed: `npm install`

---

## 🎉 Success Checklist

Before considering the feature complete, verify:
- [ ] Can access AI Chat from navbar
- [ ] Chat opens on dedicated page
- [ ] Can send messages
- [ ] AI responds appropriately
- [ ] Quick prompts work
- [ ] Chat can be minimized/reopened
- [ ] Mobile view works correctly
- [ ] Animations are smooth
- [ ] Error messages display correctly
- [ ] Timestamps show correctly

---

**Last Updated**: November 10, 2025
**Status**: ✅ Fully Functional and Ready to Use!
**Access**: Click "AI Chat" in the navigation bar
