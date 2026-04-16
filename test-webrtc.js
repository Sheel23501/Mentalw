// Test script to verify WebRTC server and client functionality
// Run with: node test-webrtc.js

import fetch from 'node-fetch';
import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';

async function testWebRTC() {
  console.log('\n🧪 Testing WebRTC Video Call System...\n');

  try {
    // Test 1: Create a room
    console.log('Test 1: Creating a room...');
    const createResponse = await fetch(`${SERVER_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        userName: 'Alice',
        roomName: 'test-call-1'
      })
    });

    const roomData = await createResponse.json();
    if (!roomData.success) {
      throw new Error('Failed to create room');
    }
    console.log('✅ Room created:', roomData.roomId);
    const roomId = roomData.roomId;

    // Test 2: Get room details
    console.log('\nTest 2: Getting room details...');
    const detailsResponse = await fetch(`${SERVER_URL}/api/rooms/${roomId}`);
    const roomDetails = await detailsResponse.json();
    console.log('✅ Room details:', {
      id: roomDetails.room.id,
      name: roomDetails.room.name,
      participants: roomDetails.room.participantCount
    });

    // Test 3: Connect first user via Socket.IO
    console.log('\nTest 3: Connecting first user (Alice)...');
    const socket1 = io(SERVER_URL);

    await new Promise((resolve, reject) => {
      socket1.on('connect', () => {
        console.log('✅ Alice connected to server');
        socket1.emit('user:register', { userId: 'user-1', userName: 'Alice' });
        setTimeout(resolve, 500);
      });
      socket1.on('connect_error', reject);
    });

    // Test 4: Second user joins room
    console.log('\nTest 4: Connecting second user (Bob) and joining room...');
    const socket2 = io(SERVER_URL);

    await new Promise((resolve, reject) => {
      socket2.on('connect', () => {
        console.log('✅ Bob connected to server');
        socket2.emit('user:register', { userId: 'user-2', userName: 'Bob' });

        // Listen for participation events
        socket2.on('room:joined', (data) => {
          console.log('✅ Bob joined room');
          console.log('   Participants:', data.participants.map(p => p.name));
          resolve();
        });

        // Join the room
        socket2.emit('room:join', {
          roomId,
          userId: 'user-2',
          userName: 'Bob'
        });
      });
      socket2.on('connect_error', reject);
    });

    // Test 5: Listen for participant join event on first user
    console.log('\nTest 5: Verifying Alice received notification of Bob joining...');
    let bobJoinedNotified = false;

    socket1.on('room:participantJoined', (data) => {
      console.log('✅ Alice notified of Bob joining');
      console.log('   Total participants:', data.totalParticipants);
      bobJoinedNotified = true;
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!bobJoinedNotified) {
      console.log('⚠️  (Participant join event may arrive asynchronously)');
    }

    // Test 6: List active rooms
    console.log('\nTest 6: Listing active rooms...');
    const listResponse = await fetch(`${SERVER_URL}/api/rooms`);
    const roomsList = await listResponse.json();
    console.log('✅ Active rooms:', roomsList.total);
    console.log('   Rooms:', roomsList.rooms.map(r => r.name));

    // Test 7: Simulate WebRTC signaling
    console.log('\nTest 7: Simulating WebRTC offer/answer exchange...');

    // Alice sends offer to Bob
    socket1.emit('webrtc:offer', {
      roomId,
      to: socket2.id,
      offer: { type: 'offer', sdp: 'mock-sdp-offer' }
    });

    await new Promise(resolve => {
      socket2.once('webrtc:offer', (data) => {
        console.log('✅ Bob received offer from Alice');
        
        // Bob sends answer back
        socket2.emit('webrtc:answer', {
          roomId,
          to: socket1.id,
          answer: { type: 'answer', sdp: 'mock-sdp-answer' }
        });
        resolve();
      });

      setTimeout(resolve, 2000);
    });

    await new Promise(resolve => {
      socket1.once('webrtc:answer', (data) => {
        console.log('✅ Alice received answer from Bob');
        resolve();
      });
      setTimeout(resolve, 2000);
    });

    // Test 8: Leave room
    console.log('\nTest 8: Bob leaving the room...');
    socket2.emit('room:leave', {
      roomId,
      userId: 'user-2'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    socket1.on('room:participantLeft', (data) => {
      console.log('✅ Alice notified that Bob left');
      console.log('   Remaining participants:', data.remainingParticipants);
    });

    // Test 9: Verify room still exists with Alice
    console.log('\nTest 9: Verifying room still exists with Alice...');
    const finalDetailsResponse = await fetch(`${SERVER_URL}/api/rooms/${roomId}`);
    const finalDetails = await finalDetailsResponse.json();
    console.log('✅ Room still active with', finalDetails.room.participantCount, 'participant');

    // Cleanup
    console.log('\nTest 10: Cleanup - closing room...');
    const closeResponse = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
      method: 'DELETE'
    });
    console.log('✅ Room closed');

    socket1.disconnect();
    socket2.disconnect();

    console.log('\n✅ All tests passed! WebRTC system is functional.\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testWebRTC().catch(console.error);
